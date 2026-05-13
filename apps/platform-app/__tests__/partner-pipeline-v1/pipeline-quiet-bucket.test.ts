// Test 4: pipeline quiet bucket — FoR active, NOA completed, last disbursement 45 days ago
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

  // Seed: NOA envelope (state='completed')
  const { rows: envRows } = await client.query<{ id: string }>(
    `INSERT INTO "${schemaName}".noa_envelopes
       (external_id, carrier_dot, factor_slug, provider, state, signed_at)
     VALUES (gen_random_uuid(), '3333333', 'apex-capital', 'hellosign', 'completed', now() - interval '50 days')
     RETURNING id`,
  );
  const envelopeId = envRows[0]!.id;

  // Seed: FoR active
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, noa_envelope_id)
     VALUES ('3333333', 'apex-capital', 'Carrier 3333333', 'active', now() - interval '50 days', $1)`,
    [envelopeId],
  );

  // Seed: disbursement 45 days ago (outside 30-day window → quiet per P1 inclusive boundary)
  const disbDate = new Date();
  disbDate.setUTCDate(disbDate.getUTCDate() - 45);
  const disbDateStr = disbDate.toISOString().slice(0, 10);

  await client.query(
    `INSERT INTO "${schemaName}".disbursements
       (factor_slug, carrier_dot, amount_cents, disbursed_at, source, status)
     VALUES ('apex-capital', '3333333', 750000, $1, 'manual', 'observed')`,
    [disbDateStr],
  );
});

afterAll(async () => {
  await cleanup();
});

describe('pipeline quiet bucket', () => {
  it('carrier with completed NOA and 45-day-old disbursement appears in quiet stage', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      const { getPipelineCarriers } = await import('@/lib/pipeline/queries');
      const { computeCarrierStage } = await import('@/lib/pipeline/stage');

      const carriers = await getPipelineCarriers('apex-capital', { pool, schema: schemaName });

      const carrier = carriers.find((c) => c.carrier_dot === '3333333');
      expect(carrier, 'Carrier 3333333 should appear in pipeline results').toBeDefined();

      const stage = computeCarrierStage(carrier!);
      expect(stage).toBe('quiet');

      // Days since last disbursement should be >= 30
      const lastDisb = carrier!.last_disbursement_at;
      expect(lastDisb).toBeTruthy();

      const disbDate = new Date(lastDisb! + 'T00:00:00Z');
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      const daysSince = Math.floor((now.getTime() - disbDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysSince).toBeGreaterThanOrEqual(30);
    } finally {
      await pool.end();
    }
  });
});
