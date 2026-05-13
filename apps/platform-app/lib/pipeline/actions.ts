'use server';

import { revalidatePath } from 'next/cache';
import { Pool, PoolClient } from 'pg';

function getPool(): Pool {
  const connString = process.env.HQX_DB_URL_POOLED;
  if (!connString) throw new Error('HQX_DB_URL_POOLED not set');
  return new Pool({ connectionString: connString, max: 4 });
}

let _pool: Pool | null = null;
function defaultPool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

export interface MarkCarrierOffboardedInput {
  carrierDot: string;
  factorSlug: string;
  reason: string;
}

export interface MarkCarrierOffboardedResult {
  success: boolean;
  forId?: string;
  error?: string;
}

/**
 * Revoke the active FoR and write an audit log entry — in a single transaction.
 * Per P4: reason goes into payload jsonb, not a text column.
 */
export async function markCarrierOffboarded(
  input: MarkCarrierOffboardedInput,
  opts?: { pool?: Pool },
): Promise<MarkCarrierOffboardedResult> {
  const SCHEMA = process.env.LTH_SCHEMA ?? 'lth';
  const db = opts?.pool ?? defaultPool();
  const client: PoolClient = await db.connect();

  try {
    await client.query('BEGIN');

    // Update FoR: set status = 'revoked', revoked_at = now()
    const { rows: updated } = await client.query<{ id: string }>(
      `UPDATE "${SCHEMA}".factor_of_record
       SET status = 'revoked', revoked_at = now()
       WHERE carrier_dot = $1 AND factor_slug = $2 AND status = 'active'
       RETURNING id`,
      [input.carrierDot, input.factorSlug],
    );

    const forRow = updated[0];
    if (!forRow) {
      await client.query('ROLLBACK');
      return { success: false, error: 'No active factor_of_record found for this carrier and factor' };
    }

    // Write audit log with reason in payload jsonb
    await client.query(
      `INSERT INTO "${SCHEMA}".factor_audit_log
         (carrier_dot, factor_slug, event, payload, for_id)
       VALUES ($1, $2, 'for.revoked', $3::jsonb, $4)`,
      [
        input.carrierDot,
        input.factorSlug,
        JSON.stringify({ reason: input.reason }),
        forRow.id,
      ],
    );

    await client.query('COMMIT');

    revalidatePath(`/partner/${input.factorSlug}/pipeline`);

    return { success: true, forId: forRow.id };
  } catch (err) {
    await client.query('ROLLBACK');
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    client.release();
  }
}
