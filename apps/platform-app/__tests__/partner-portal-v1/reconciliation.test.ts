// Test 10: reconciliation quarter window math
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
  vi.stubEnv('HQX_DB_URL_POOLED', process.env.HQX_DB_URL_POOLED!);

  // Seed billing config: cycle starts 2026-04-01 (Q2 2026)
  await client.query(
    `INSERT INTO "${schemaName}".factor_billing_config
       (factor_slug, platform_fee_cents, disbursement_bps, billing_cycle_anchor)
     VALUES ('apex-capital', 250000, 50, '2026-04-01')`,
  );

  // Seed 5 disbursements totaling $20,000 in Q2 2026
  const disbDates = ['2026-04-15', '2026-04-30', '2026-05-10', '2026-05-20', '2026-06-01'];
  const amounts = [5000, 3000, 4000, 5000, 3000]; // total = $20,000
  for (let i = 0; i < 5; i++) {
    await client.query(
      `INSERT INTO "${schemaName}".disbursements
         (factor_slug, carrier_dot, amount_cents, disbursed_at, source, status)
       VALUES ('apex-capital', '1234567', $1, $2, 'manual', 'observed')`,
      [amounts[i] * 100, disbDates[i]],
    );
  }
});

afterAll(async () => {
  await cleanup();
});

describe('getReconciliation', () => {
  it('computes correct quarter window and financials for Q2 2026', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      const { getReconciliation, formatCents } = await import('@/lib/reconciliation/index');

      // Use May 13, 2026 as asOf — should land in Q2 2026 (Apr 1 – Jun 30)
      const asOf = new Date('2026-05-13T12:00:00Z');
      const rec = await getReconciliation('apex-capital', asOf, {
        pool: pool as unknown as import('pg').Pool,
        schema: schemaName,
      });

      // Window
      expect(rec.windowStart).toBe('2026-04-01');
      expect(rec.windowEnd).toBe('2026-06-30');

      // Disbursements
      expect(rec.disbursementCount).toBe(5);
      expect(rec.totalDisbursedCents).toBe(2000000); // $20,000 in cents

      // Disbursement skim: $20,000 × 0.005 = $100.00 → 10000 cents
      expect(rec.disbursementSkimCents).toBe(10000);

      // Platform fee: $2,500 → 250000 cents
      expect(rec.platformFeeCents).toBe(250000);

      // Total: $2,600 → 260000 cents
      expect(rec.totalDueCents).toBe(260000);

      // Format helpers
      expect(formatCents(rec.totalDisbursedCents)).toBe('$20,000.00');
      expect(formatCents(rec.disbursementSkimCents)).toBe('$100.00');
      expect(formatCents(rec.platformFeeCents)).toBe('$2,500.00');
      expect(formatCents(rec.totalDueCents)).toBe('$2,600.00');
    } finally {
      await pool.end();
    }
  });
});
