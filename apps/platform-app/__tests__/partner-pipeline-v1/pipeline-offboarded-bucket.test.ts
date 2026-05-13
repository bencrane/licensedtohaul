// Test 5: pipeline offboarded bucket — revoked FoR shows in offboarded; no-FoR carrier excluded
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

  // Seed: carrier 4444444 — FoR status='revoked'
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, revoked_at)
     VALUES ('4444444', 'apex-capital', 'Carrier 4444444', 'revoked',
             now() - interval '60 days', now() - interval '10 days')`,
  );

  // carrier 9999999 — no FoR row at all (should NOT appear in pipeline)
  // (no insert needed)
});

afterAll(async () => {
  await cleanup();
});

describe('pipeline offboarded bucket', () => {
  it('carrier with revoked FoR appears in offboarded stage', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      const { getPipelineCarriers } = await import('@/lib/pipeline/queries');
      const { computeCarrierStage } = await import('@/lib/pipeline/stage');

      const carriers = await getPipelineCarriers('apex-capital', { pool, schema: schemaName });

      // Carrier 4444444 (revoked FoR) must appear in offboarded
      const revokedCarrier = carriers.find((c) => c.carrier_dot === '4444444');
      expect(revokedCarrier, 'Carrier 4444444 (revoked FoR) should appear in results').toBeDefined();
      expect(computeCarrierStage(revokedCarrier!)).toBe('offboarded');
      expect(revokedCarrier!.for_status).toBe('revoked');
      expect(revokedCarrier!.revoked_at).toBeTruthy();

      // Carrier 9999999 (no FoR row) must NOT appear in pipeline at all
      const noForCarrier = carriers.find((c) => c.carrier_dot === '9999999');
      expect(noForCarrier, 'Carrier 9999999 (no FoR) should NOT appear in pipeline').toBeUndefined();
    } finally {
      await pool.end();
    }
  });
});
