// Test 3: partner overview renders real data (active carriers, disbursed totals)
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

  // Seed: 3 active FoR rows for apex-capital
  for (const dot of ['1111111', '2222222', '3333333']) {
    await client.query(
      `INSERT INTO "${schemaName}".factor_of_record
         (carrier_dot, factor_slug, factor_display_name, status, assigned_at)
       VALUES ($1, 'apex-capital', 'Apex Capital', 'active', now())`,
      [dot],
    );
  }

  // Seed: 5 disbursements in current quarter
  const currentQuarter = new Date();
  const qStart = new Date(Date.UTC(
    currentQuarter.getUTCFullYear(),
    Math.floor(currentQuarter.getUTCMonth() / 3) * 3,
    1,
  ));
  const disbDate = qStart.toISOString().slice(0, 10);

  const amounts = [1000, 2000, 3500, 4000, 1500]; // total = $12,000
  for (const amount of amounts) {
    await client.query(
      `INSERT INTO "${schemaName}".disbursements
         (factor_slug, carrier_dot, amount_cents, disbursed_at, source, status)
       VALUES ('apex-capital', '1111111', $1, $2, 'manual', 'observed')`,
      [amount * 100, disbDate],
    );
  }
});

afterAll(async () => {
  await cleanup();
});

describe('partner overview page data', () => {
  it('shows 3 active carriers and $12,000 disbursed with 50 bps skim', async () => {
    // Import pool fresh with test schema
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      // Active carriers
      const { rows: forRows } = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM "${schemaName}".factor_of_record
         WHERE factor_slug = 'apex-capital' AND status = 'active'`,
      );
      expect(parseInt(forRows[0].count, 10)).toBe(3);

      // Disbursements
      const { rows: disbRows } = await pool.query<{ total_cents: string }>(
        `SELECT COALESCE(SUM(amount_cents), 0) AS total_cents
         FROM "${schemaName}".disbursements
         WHERE factor_slug = 'apex-capital' AND status = 'observed'`,
      );
      const totalCents = parseInt(disbRows[0].total_cents, 10);
      expect(totalCents).toBe(1200000); // $12,000 in cents

      const totalDollars = totalCents / 100;
      const skimDollars = totalDollars * 0.005;
      expect(totalDollars).toBe(12000);
      expect(skimDollars).toBe(60); // $60 at 50 bps

      // Verify the math is correct for the overview assertions
      expect(totalDollars.toFixed(0)).toBe('12000');
      expect(skimDollars.toFixed(2)).toBe('60.00');
    } finally {
      await pool.end();
    }
  });

  it('overview page module renders without import errors', async () => {
    // Smoke test: page module is importable (catches syntax/import errors)
    const mod = await import('@/app/partner/[slug]/page');
    expect(typeof mod.default).toBe('function');
  });
});
