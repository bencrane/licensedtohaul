import { Pool } from 'pg';
import { getStripeBillingClient } from './index';

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

export async function emitPendingBillingEvents(
  opts?: { pool?: Pool },
): Promise<{ emittedCount: number; failedCount: number }> {
  const SCHEMA = process.env.LTH_SCHEMA ?? 'lth';
  const db = opts?.pool ?? pool();
  const billing = getStripeBillingClient();

  // Fetch pending events with their stripe customer mapping
  const { rows: pendingEvents } = await db.query<{
    id: string;
    factor_slug: string;
    event_name: string;
    payload: Record<string, unknown>;
    stripe_customer_id: string | null;
    stripe_meter_id_noa_transition: string | null;
    stripe_meter_id_submission_cleared: string | null;
    stripe_meter_id_disbursement_skim: string | null;
  }>(
    `SELECT be.id, be.factor_slug, be.event_name, be.payload,
            sc.stripe_customer_id,
            sc.stripe_meter_id_noa_transition,
            sc.stripe_meter_id_submission_cleared,
            sc.stripe_meter_id_disbursement_skim
     FROM "${SCHEMA}".factor_billing_events be
     LEFT JOIN "${SCHEMA}".factor_stripe_customers sc ON sc.factor_slug = be.factor_slug
     WHERE be.emitted = false
     ORDER BY be.created_at ASC`,
  );

  let emittedCount = 0;
  let failedCount = 0;

  for (const evt of pendingEvents) {
    try {
      if (!evt.stripe_customer_id) {
        failedCount++;
        continue;
      }

      let meterId: string | null = null;
      let meterValue = 1;

      if (evt.event_name === 'noa.transition') {
        meterId = evt.stripe_meter_id_noa_transition;
      } else if (evt.event_name === 'submission.cleared') {
        meterId = evt.stripe_meter_id_submission_cleared;
      } else if (evt.event_name === 'disbursement.observed') {
        meterId = evt.stripe_meter_id_disbursement_skim;
        // Value is the amount in cents; the meter tracks skim volume
        const amountCents = Number(evt.payload?.amount_cents ?? 0);
        meterValue = amountCents;
      }

      if (!meterId) {
        failedCount++;
        continue;
      }

      const result = await billing.emitMeterEvent({
        customer: evt.stripe_customer_id,
        event: meterId,
        value: meterValue,
        idempotencyKey: evt.id,
      });

      await db.query(
        `UPDATE "${SCHEMA}".factor_billing_events
         SET emitted = true, emitted_at = now(), stripe_event_id = $1
         WHERE id = $2`,
        [result.id, evt.id],
      );

      emittedCount++;
    } catch {
      failedCount++;
    }
  }

  return { emittedCount, failedCount };
}
