// Test 3: pipeline active bucket — FoR active, NOA completed, disbursement 5 days ago
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
     VALUES (gen_random_uuid(), '2222222', 'apex-capital', 'hellosign', 'completed', now() - interval '10 days')
     RETURNING id`,
  );
  const envelopeId = envRows[0]!.id;

  // Seed: FoR active
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, noa_envelope_id)
     VALUES ('2222222', 'apex-capital', 'Carrier 2222222', 'active', now() - interval '10 days', $1)`,
    [envelopeId],
  );

  // Seed: disbursement 5 days ago (within 30-day window → active)
  const disbDate = new Date();
  disbDate.setUTCDate(disbDate.getUTCDate() - 5);
  const disbDateStr = disbDate.toISOString().slice(0, 10);

  await client.query(
    `INSERT INTO "${schemaName}".disbursements
       (factor_slug, carrier_dot, amount_cents, disbursed_at, source, status)
     VALUES ('apex-capital', '2222222', 500000, $1, 'manual', 'observed')`,
    [disbDateStr],
  );
});

afterAll(async () => {
  await cleanup();
});

describe('pipeline active bucket', () => {
  it('carrier with completed NOA and 5-day-old disbursement appears in active stage', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      const { getPipelineCarriers } = await import('@/lib/pipeline/queries');
      const { computeCarrierStage } = await import('@/lib/pipeline/stage');

      const carriers = await getPipelineCarriers('apex-capital', { pool, schema: schemaName });

      const carrier = carriers.find((c) => c.carrier_dot === '2222222');
      expect(carrier, 'Carrier 2222222 should appear in pipeline results').toBeDefined();

      const stage = computeCarrierStage(carrier!);
      expect(stage).toBe('active');

      // Card shows last disbursement date
      expect(carrier!.last_disbursement_at).toBeTruthy();
    } finally {
      await pool.end();
    }
  });
});
