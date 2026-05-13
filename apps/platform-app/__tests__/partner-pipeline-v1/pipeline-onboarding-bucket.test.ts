// Test 2: pipeline onboarding bucket — FoR active, NOA envelope sent (not completed)
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

  // Seed: NOA envelope (state='sent')
  const { rows: envRows } = await client.query<{ id: string }>(
    `INSERT INTO "${schemaName}".noa_envelopes
       (external_id, carrier_dot, factor_slug, provider, state)
     VALUES (gen_random_uuid(), '1111111', 'apex-capital', 'hellosign', 'sent')
     RETURNING id`,
  );
  const envelopeId = envRows[0]!.id;

  // Seed: FoR active, linked to envelope
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, noa_envelope_id)
     VALUES ('1111111', 'apex-capital', 'Carrier 1111111', 'active', now(), $1)`,
    [envelopeId],
  );
});

afterAll(async () => {
  await cleanup();
});

describe('pipeline onboarding bucket', () => {
  it('carrier with active FoR and NOA state=sent appears in onboarding stage', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      // Directly execute the pipeline query to assert grouping
      const { getPipelineCarriers } = await import('@/lib/pipeline/queries');
      const { computeCarrierStage } = await import('@/lib/pipeline/stage');

      const carriers = await getPipelineCarriers('apex-capital', { pool, schema: schemaName });

      const carrier = carriers.find((c) => c.carrier_dot === '1111111');
      expect(carrier, 'Carrier 1111111 should appear in pipeline results').toBeDefined();

      const stage = computeCarrierStage(carrier!);
      expect(stage).toBe('onboarding');

      // Card shows DOT
      expect(carrier!.carrier_dot).toBe('1111111');
      // Card shows carrier name
      expect(carrier!.carrier_name).toBeTruthy();
      // NOA state is 'sent'
      expect(carrier!.noa_state).toBe('sent');
    } finally {
      await pool.end();
    }
  });
});
