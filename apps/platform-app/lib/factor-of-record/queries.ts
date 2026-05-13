import { Pool } from 'pg';
import type { FactorOfRecordRow, FactorAuditLogRow } from './types';

function getPool(): Pool {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) throw new Error('LTH_DB_POOLED_URL not set');
  return new Pool({ connectionString: connString, max: 4 });
}

let _pool: Pool | null = null;
function defaultPool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

export async function getActiveFactorOfRecord(
  carrierDot: string,
  opts?: { pool?: Pool },
): Promise<FactorOfRecordRow | null> {
    const db = opts?.pool ?? defaultPool();
  const { rows } = await db.query<FactorOfRecordRow>(
    `SELECT id, carrier_dot, factor_slug, factor_display_name, status,
            assigned_at, revoked_at, noa_envelope_id, created_at
     FROM factor_of_record
     WHERE carrier_dot = $1 AND status = 'active'
     ORDER BY assigned_at DESC
     LIMIT 1`,
    [carrierDot],
  );
  return rows[0] ?? null;
}

export async function recordForTransition(
  opts: {
    pool: Pool;
    carrierDot: string;
    factorSlug: string;
    factorDisplayName: string;
    noaEnvelopeId: string;
    assignedAt: Date;
    signedAt: Date;
  },
): Promise<{ newForId: string; revokedForId: string | null }> {
    const { pool: db, carrierDot, factorSlug, factorDisplayName, noaEnvelopeId, assignedAt } = opts;

  // Revoke existing active FoR
  const { rows: revoked } = await db.query<{ id: string }>(
    `UPDATE factor_of_record
     SET status = 'revoked', revoked_at = $1
     WHERE carrier_dot = $2 AND status = 'active'
     RETURNING id`,
    [assignedAt, carrierDot],
  );
  const revokedForId = revoked[0]?.id ?? null;

  // Insert new active FoR
  const { rows: inserted } = await db.query<{ id: string }>(
    `INSERT INTO factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, noa_envelope_id)
     VALUES ($1, $2, $3, 'active', $4, $5)
     RETURNING id`,
    [carrierDot, factorSlug, factorDisplayName, assignedAt, noaEnvelopeId],
  );
  const newForId = inserted[0]!.id;

  return { newForId, revokedForId };
}

export async function writeAuditLog(
  entry: {
    carrierDot?: string;
    factorSlug?: string;
    event: string;
    payload?: Record<string, unknown>;
    noaEnvelopeId?: string;
    forId?: string;
  },
  opts: { pool: Pool },
): Promise<void> {
    const db = opts.pool;
  await db.query(
    `INSERT INTO factor_audit_log
       (carrier_dot, factor_slug, event, payload, noa_envelope_id, for_id)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    [
      entry.carrierDot ?? null,
      entry.factorSlug ?? null,
      entry.event,
      JSON.stringify(entry.payload ?? {}),
      entry.noaEnvelopeId ?? null,
      entry.forId ?? null,
    ],
  );
}

export type { FactorOfRecordRow, FactorAuditLogRow };
