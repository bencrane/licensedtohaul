import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getSignatureProvider } from '@/lib/signature/index';
import { DocumensoProvider } from '@/lib/signature/documenso';
import { getFactorDisplayName } from '@/lib/factor-of-record/types';
import { recordForTransition, writeAuditLog } from '@/lib/factor-of-record/queries';
import { transitionSubmissionStageByDotSlug } from '@/lib/quote-submissions/actions';
import {
  getDocumentByDocumensoId,
} from '@/lib/factor-documents/queries';
import {
  markCarrierSigned,
  markFactorSigned,
  markCompleted,
  markRejected,
  markVoided,
} from '@/lib/factor-documents/actions';

export const dynamic = 'force-dynamic';

function getPool(): Pool {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) throw new Error('LTH_DB_POOLED_URL not set');
  return new Pool({ connectionString: connString, max: 4 });
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

export async function POST(req: Request): Promise<Response> {
  // Dispatch on ?provider= query param or X-Signature-Provider header.
  // Default to the configured provider (v1 compatible).
  const url = new URL(req.url);
  const providerParam =
    url.searchParams.get('provider') ??
    req.headers.get('x-signature-provider') ??
    null;

  try {
    const rawBody = Buffer.from(await req.arrayBuffer());
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    let provider;
    if (providerParam === 'documenso') {
      // Use a real DocumensoProvider for secret check regardless of env singleton
      const secret = process.env.DOCUMENSO_WEBHOOK_SECRET;
      if (!secret) {
        return NextResponse.json(
          { error: 'missing DOCUMENSO_WEBHOOK_SECRET in Doppler' },
          { status: 503 },
        );
      }
      provider = new DocumensoProvider();
    } else {
      provider = getSignatureProvider();
    }

    const { verified, events } = provider.handleWebhook(rawBody, headersObj);

    if (!verified) {
      return NextResponse.json({ error: 'webhook verification failed' }, { status: 401 });
    }

    // Determine which events need DB
    const hasCompletedEvents = events.some((e) => e.kind === 'envelope.completed');
    const hasSignedEvents = events.some((e) => e.kind === 'envelope.signed');
    const hasDeclinedEvents = events.some((e) => e.kind === 'envelope.declined');
    const hasExpiredEvents = events.some((e) => e.kind === 'envelope.expired');
    const needsDb = hasCompletedEvents || hasSignedEvents || hasDeclinedEvents || hasExpiredEvents;
    const db = needsDb ? (() => { try { return pool(); } catch { return null; } })() : null;

    // Parse the raw body to extract the Documenso document ID for factor_documents routing
    let webhookPayload: Record<string, unknown> | null = null;
    try {
      webhookPayload = JSON.parse(rawBody.toString('utf-8')) as Record<string, unknown>;
    } catch {
      // non-fatal; use events only
    }

    // Documenso v2 shape: { event, payload: { id, ... } }; v1 shape: { event, data: { id, ... } }
    const docPayload = webhookPayload
      ? ((webhookPayload.payload ?? webhookPayload.data) as Record<string, unknown> | undefined)
      : undefined;
    const documensoDocId = docPayload?.id ? String(docPayload.id) : null;

    for (const event of events) {
      // -----------------------------------------------------------------------
      // Factor Documents routing (new v2 path)
      // -----------------------------------------------------------------------
      if (documensoDocId && (hasSignedEvents || hasCompletedEvents || hasDeclinedEvents || hasExpiredEvents)) {
        const factorDoc = await getDocumentByDocumensoId(documensoDocId).catch(() => null);

        if (factorDoc) {
          if (event.kind === 'envelope.signed') {
            // Determine which signer signed: carrier or factor
            // Extract current signer email from webhook payload
            const currentSignerEmail =
              String(
                (docPayload?.currentSigner as Record<string, unknown> | undefined)?.email ??
                '',
              ) || null;

            // Compare to stored tokens to determine role
            // If we can't determine role, fall back to carrier first
            const isFactorSigner =
              currentSignerEmail && factorDoc.factor_signing_token &&
              event.signerRole === 'factor';

            if (isFactorSigner) {
              await markFactorSigned({ documentId: factorDoc.id }).catch(console.error);
            } else {
              await markCarrierSigned({ documentId: factorDoc.id }).catch(console.error);
            }
            continue;
          }

          if (event.kind === 'envelope.completed') {
            await markCompleted({ documentId: factorDoc.id }).catch(console.error);
            continue;
          }

          if (event.kind === 'envelope.declined') {
            const reason = (event as { reason?: string }).reason ?? '';
            await markRejected({ documentId: factorDoc.id, reason }).catch(console.error);
            continue;
          }

          if (event.kind === 'envelope.expired') {
            await markVoided({ documentId: factorDoc.id, reason: 'expired' }).catch(console.error);
            continue;
          }
        }
      }

      // -----------------------------------------------------------------------
      // Legacy noa_envelopes path (PR #13 backward compat — fires when NO factor_documents row)
      // -----------------------------------------------------------------------
      if (event.kind === 'envelope.completed') {
        if (!db) continue;
        const externalId = event.envelope.externalId;
        const completedAt = event.envelope.completedAt ?? new Date();
        const signerIp = event.envelope.signers[0]?.ip ?? null;

        // For Documenso webhooks, externalId comes from the payload externalId field.
        if (!externalId) continue;

        // Look up the envelope row
        const { rows: envRows } = await db.query<{
          id: string;
          carrier_dot: string;
          factor_slug: string;
        }>(
          `SELECT id, carrier_dot, factor_slug
           FROM noa_envelopes
           WHERE external_id = $1`,
          [externalId],
        ).catch(() => ({ rows: [] as { id: string; carrier_dot: string; factor_slug: string }[] }));

        if (!envRows[0]) continue;

        const envRow = envRows[0];

        // Update envelope state
        await db.query(
          `UPDATE noa_envelopes
           SET state = 'completed', signed_at = $1, signer_ip = $2, updated_at = now()
           WHERE id = $3`,
          [completedAt, signerIp, envRow.id],
        );

        // Record FoR transition (revoke prior, insert new)
        const factorDisplayName = getFactorDisplayName(envRow.factor_slug);
        const { newForId, revokedForId } = await recordForTransition({
          pool: db,
          carrierDot: envRow.carrier_dot,
          factorSlug: envRow.factor_slug,
          factorDisplayName,
          noaEnvelopeId: envRow.id,
          assignedAt: completedAt,
          signedAt: completedAt,
        });

        // Audit: for.assigned
        await writeAuditLog(
          {
            carrierDot: envRow.carrier_dot,
            factorSlug: envRow.factor_slug,
            event: 'for.assigned',
            payload: {
              envelope_id: externalId,
              new_for_id: newForId,
              revoked_for_id: revokedForId,
            },
            noaEnvelopeId: envRow.id,
            forId: newForId,
          },
          { pool: db },
        );

        if (revokedForId) {
          await writeAuditLog(
            {
              carrierDot: envRow.carrier_dot,
              factorSlug: envRow.factor_slug,
              event: 'for.revoked',
              payload: {
                envelope_id: externalId,
                revoked_for_id: revokedForId,
              },
              noaEnvelopeId: envRow.id,
              forId: revokedForId,
            },
            { pool: db },
          );
        }

        // Queue billing event
        await db.query(
          `INSERT INTO factor_billing_events
             (factor_slug, event_name, payload)
           VALUES ($1, 'noa.transition', $2::jsonb)`,
          [
            envRow.factor_slug,
            JSON.stringify({ envelope_id: externalId, for_id: newForId }),
          ],
        );

        // Advance quote_submissions.stage to 'active' (p7 requirement)
        await transitionSubmissionStageByDotSlug({
          pool: db,
          carrierDot: envRow.carrier_dot,
          factorSlug: envRow.factor_slug,
          toStage: 'active',
          actor: 'system',
          note: 'NOA signed — envelope.completed webhook',
          factorOfRecordId: newForId,
        }).catch(() => {
          // Non-fatal: quote_submissions row may not exist if submission pre-dates this feature
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('webhook/signature error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}
