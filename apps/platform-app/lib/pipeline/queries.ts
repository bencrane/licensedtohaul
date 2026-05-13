import { Pool } from 'pg';
import type { PipelineCarrierRow } from './stage';

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

/**
 * Returns all carriers that have ever had a factor_of_record row for this factor.
 * For each, resolves: FoR status, noa_state (LEFT JOIN), last disbursement date (LATERAL).
 *
 * Key correctness invariants (per P1/P2):
 *   - LEFT JOIN on noa_envelopes: null noa_state = not completed → onboarding
 *   - disbursed_at >= CURRENT_DATE - INTERVAL '30 days' (inclusive)
 */
export async function getPipelineCarriers(
  factorSlug: string,
  opts?: { pool?: Pool; schema?: string },
): Promise<PipelineCarrierRow[]> {
  const SCHEMA = opts?.schema ?? process.env.LTH_SCHEMA ?? 'lth';
  const db = opts?.pool ?? defaultPool();

  const { rows } = await db.query<PipelineCarrierRow>(
    `SELECT
       f.carrier_dot,
       COALESCE(f.factor_display_name, 'Carrier ' || f.carrier_dot) AS carrier_name,
       f.status AS for_status,
       e.state AS noa_state,
       d.last_disbursement_at,
       f.assigned_at,
       f.revoked_at
     FROM "${SCHEMA}".factor_of_record f
     LEFT JOIN "${SCHEMA}".noa_envelopes e ON e.id = f.noa_envelope_id
     LEFT JOIN LATERAL (
       SELECT MAX(disbursed_at::text) AS last_disbursement_at
       FROM "${SCHEMA}".disbursements
       WHERE carrier_dot = f.carrier_dot
         AND factor_slug = $1
     ) d ON true
     WHERE f.factor_slug = $1
     ORDER BY
       CASE f.status WHEN 'active' THEN 0 ELSE 1 END,
       f.assigned_at DESC`,
    [factorSlug],
  );

  return rows;
}

export type { PipelineCarrierRow };
