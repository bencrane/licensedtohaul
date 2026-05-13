import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import type { Client } from 'pg';

vi.stubEnv('STRIPE_API_KEY', 'sk_test_fake');

let schemaName: string;
let client: Client;
let cleanup: () => Promise<void>;

let billingEventId: string;

beforeAll(async () => {
  const harness = await createTestSchema();
  schemaName = harness.schemaName;
  client = harness.client;
  cleanup = harness.cleanup;
  vi.stubEnv('LTH_SCHEMA', schemaName);
  vi.stubEnv('LTH_DB_POOLED_URL', process.env.LTH_DB_POOLED_URL!);

  // Seed billing event
  const { rows: evtRows } = await client.query<{ id: string }>(
    `INSERT INTO "${schemaName}".factor_billing_events
       (factor_slug, event_name, emitted, payload)
     VALUES ('apex-capital', 'noa.transition', false, '{"envelope_id":"env-2"}')
     RETURNING id`,
  );
  billingEventId = evtRows[0].id;

  // Seed stripe customer mapping
  await client.query(
    `INSERT INTO "${schemaName}".factor_stripe_customers
       (factor_slug, stripe_customer_id, stripe_meter_id_noa_transition)
     VALUES ('apex-capital', 'cus_test_apex', 'mtr_noa_test')`,
  );
});

afterAll(async () => {
  await cleanup();
});

describe('emitPendingBillingEvents', () => {
  it('emits pending events and marks them as emitted', async () => {
    // Reset billing client singleton so FakeStripeBillingClient is used fresh
    const { resetStripeBillingClient, FakeStripeBillingClient } = await import('@/lib/billing/index');
    resetStripeBillingClient();

    const { emitPendingBillingEvents } = await import('@/lib/billing/emit');
    const { Pool } = await import('pg');

    // Pass client's connection string as pool so the harness schema is used
    const pool = new Pool({ connectionString: process.env.LTH_DB_POOLED_URL!, max: 1 });

    const result = await emitPendingBillingEvents({ pool });
    await pool.end();

    expect(result.emittedCount).toBe(1);
    expect(result.failedCount).toBe(0);

    // The FakeStripeBillingClient singleton should have recorded the event
    const { getStripeBillingClient } = await import('@/lib/billing/index');
    const billingClient = getStripeBillingClient() as InstanceType<typeof FakeStripeBillingClient>;
    const recorded = billingClient.findEvent({ customer: 'cus_test_apex', event: 'mtr_noa_test' });
    expect(recorded).toBeDefined();
    expect(recorded!.value).toBe(1);

    // Verify DB row updated
    const { rows } = await client.query(
      `SELECT emitted, emitted_at
       FROM "${schemaName}".factor_billing_events
       WHERE id = $1`,
      [billingEventId],
    );
    expect(rows[0].emitted).toBe(true);
    expect(rows[0].emitted_at).not.toBeNull();
  });
});
