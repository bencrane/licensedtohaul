import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getSignatureProvider } from '@/lib/signature/index';
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

  try {
    const rawBody = Buffer.from(await req.arrayBuffer());
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    const provider = getSignatureProvider();
    const { verified, events } = provider.handleWebhook(rawBody, headersObj);

    if (!verified) {
      return NextResponse.json({ error: 'webhook verification failed' }, { status: 400 });
    }

    for (const event of events) {
      if (event.kind === 'envelope.completed') {
        const externalId = event.envelope.externalId;
        const completedAt = event.envelope.completedAt ?? new Date();
        const signerIp = event.envelope.signers[0]?.ip ?? null;

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

        if (!envRows[0]) {
          // Unknown envelope — skip
          continue;
        }

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
