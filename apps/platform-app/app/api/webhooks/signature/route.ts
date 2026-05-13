import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getSignatureProvider, resetSignatureProvider } from '@/lib/signature/index';
import { DropboxSignProvider } from '@/lib/signature/dropbox-sign';
import { getFactorDisplayName } from '@/lib/factor-of-record/types';
import { recordForTransition, writeAuditLog } from '@/lib/factor-of-record/queries';

export const dynamic = 'force-dynamic';

function getPool(): Pool {
  const connString = process.env.HQX_DB_URL_POOLED;
  if (!connString) throw new Error('HQX_DB_URL_POOLED not set');
  return new Pool({ connectionString: connString, max: 4 });
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

export async function POST(req: Request): Promise<Response> {
  const SCHEMA = process.env.LTH_SCHEMA ?? 'lth';
  const db = pool();

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
    if (providerParam === 'dropbox-sign') {
      // Use a real DropboxSignProvider for HMAC check regardless of env singleton
      const apiKey = process.env.DROPBOX_SIGN_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'missing DROPBOX_SIGN_API_KEY in Doppler' },
          { status: 503 },
        );
      }
      provider = new DropboxSignProvider();
    } else {
      provider = getSignatureProvider();
    }

    const { verified, events } = provider.handleWebhook(rawBody, headersObj);

    if (!verified) {
      return NextResponse.json({ error: 'webhook verification failed' }, { status: 401 });
    }

    for (const event of events) {
      if (event.kind === 'envelope.completed') {
        const externalId = event.envelope.externalId;
        const completedAt = event.envelope.completedAt ?? new Date();
        const signerIp = event.envelope.signers[0]?.ip ?? null;

        // For Dropbox Sign webhooks, externalId comes from metadata in the provider —
        // if empty we skip (provider couldn't extract it from the webhook payload alone)
        if (!externalId) continue;

        // Look up the envelope row
        const { rows: envRows } = await db.query<{
          id: string;
          carrier_dot: string;
          factor_slug: string;
        }>(
          `SELECT id, carrier_dot, factor_slug
           FROM "${SCHEMA}".noa_envelopes
           WHERE external_id = $1`,
          [externalId],
        );

        if (!envRows[0]) continue;

        const envRow = envRows[0];

        // Update envelope state
        await db.query(
          `UPDATE "${SCHEMA}".noa_envelopes
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
          `INSERT INTO "${SCHEMA}".factor_billing_events
             (factor_slug, event_name, payload)
           VALUES ($1, 'noa.transition', $2::jsonb)`,
          [
            envRow.factor_slug,
            JSON.stringify({ envelope_id: externalId, for_id: newForId }),
          ],
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('webhook/signature error:', err);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}
