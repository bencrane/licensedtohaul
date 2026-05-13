// Test 8: recordDisbursement writes to disbursements + factor_billing_events
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import type { Client } from 'pg';

let schemaName: string;
let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const harness = await createTestSchema();
  schemaName = harness.schemaName;
  client = harness.client;
  cleanup = harness.cleanup;
  vi.stubEnv('LTH_SCHEMA', schemaName);
  vi.stubEnv('LTH_DB_POOLED_URL', process.env.LTH_DB_POOLED_URL!);

  // Seed: FoR
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at)
     VALUES ('1234567', 'apex-capital', 'Apex Capital', 'active', now())`,
  );
});

afterAll(async () => {
  await cleanup();
});

describe('recordDisbursement', () => {
  it('writes disbursement row with status=observed and queues a billing event', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.LTH_DB_POOLED_URL!, max: 1 });

    try {
      const { recordDisbursement } = await import('@/lib/disbursements/actions');

      const { disbursementId } = await recordDisbursement(
        {
          factorSlug: 'apex-capital',
          carrierDot: '1234567',
          amount: 1500.00,
          disbursedAt: '2026-05-13',
          referenceId: 'INV-001',
        },
        { pool: pool as unknown as import('pg').Pool },
      );

      expect(disbursementId).toBeTruthy();

      // Disbursement row
      const { rows: disbRows } = await client.query<{
        factor_slug: string;
        carrier_dot: string;
        amount_cents: string;
        status: string;
      }>(
        `SELECT factor_slug, carrier_dot, amount_cents::text, status
         FROM "${schemaName}".disbursements
         WHERE id = $1`,
        [disbursementId],
      );
      expect(disbRows).toHaveLength(1);
      expect(disbRows[0].factor_slug).toBe('apex-capital');
      expect(disbRows[0].carrier_dot).toBe('1234567');
      expect(parseInt(disbRows[0].amount_cents, 10)).toBe(150000); // $1500 in cents
      expect(disbRows[0].status).toBe('observed');

      // Billing event row
      const { rows: evtRows } = await client.query(
        `SELECT event_name, payload, emitted
         FROM "${schemaName}".factor_billing_events
         WHERE factor_slug = 'apex-capital' AND event_name = 'disbursement.observed'`,
      );
      expect(evtRows).toHaveLength(1);
      expect(evtRows[0].emitted).toBe(false);
      expect(String(evtRows[0].payload?.amount)).toBe('1500');
    } finally {
      await pool.end();
    }
  });
});
