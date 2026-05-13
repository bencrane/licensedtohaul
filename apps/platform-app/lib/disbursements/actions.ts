import { Pool } from 'pg';
import type { RecordDisbursementInput, DisbursementRow } from './types';

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

export async function recordDisbursement(
  input: RecordDisbursementInput,
  opts?: { pool?: Pool },
): Promise<{ disbursementId: string }> {
    const db = opts?.pool ?? defaultPool();
  const amountCents = Math.round(input.amount * 100);
  const source = input.source ?? 'manual';

  // Insert disbursement row
  const { rows: disbRows } = await db.query<{ id: string }>(
    `INSERT INTO disbursements
       (factor_slug, carrier_dot, amount_cents, disbursed_at, reference_id, source, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'observed')
     RETURNING id`,
    [input.factorSlug, input.carrierDot, amountCents, input.disbursedAt, input.referenceId ?? null, source],
  );
  const disbursementId = disbRows[0]!.id;

  // Queue a billing event for the disbursement (emitted=false, async worker picks it up)
  await db.query(
    `INSERT INTO factor_billing_events
       (factor_slug, event_name, payload, emitted)
     VALUES ($1, 'disbursement.observed', $2::jsonb, false)`,
    [
      input.factorSlug,
      JSON.stringify({
        disbursement_id: disbursementId,
        carrier_dot: input.carrierDot,
        amount: input.amount,
        amount_cents: amountCents,
        disbursed_at: input.disbursedAt,
      }),
    ],
  );

  return { disbursementId };
}

export async function getDisbursementsForFactor(
  factorSlug: string,
  opts?: { pool?: Pool;  },
): Promise<DisbursementRow[]> {
    const db = opts?.pool ?? defaultPool();

  const { rows } = await db.query<DisbursementRow>(
    `SELECT id, factor_slug, carrier_dot, amount_cents, disbursed_at::text AS disbursed_at,
            reference_id, source, status, observed_at
     FROM disbursements
     WHERE factor_slug = $1
     ORDER BY disbursed_at DESC, observed_at DESC`,
    [factorSlug],
  );
  return rows;
}

export async function getDisbursementsInWindow(
  factorSlug: string,
  windowStart: string,
  windowEnd: string,
  opts?: { pool?: Pool;  },
): Promise<DisbursementRow[]> {
    const db = opts?.pool ?? defaultPool();

  const { rows } = await db.query<DisbursementRow>(
    `SELECT id, factor_slug, carrier_dot, amount_cents, disbursed_at::text AS disbursed_at,
            reference_id, source, status, observed_at
     FROM disbursements
     WHERE factor_slug = $1
       AND disbursed_at >= $2
       AND disbursed_at <= $3
       AND status = 'observed'
     ORDER BY disbursed_at ASC`,
    [factorSlug, windowStart, windowEnd],
  );
  return rows;
}

export type { DisbursementRow, RecordDisbursementInput } from './types';
