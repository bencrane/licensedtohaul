// Test 6: markCarrierOffboarded server action — revokes FoR + writes audit log atomically
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

  // Mock next/cache (revalidatePath not available in test env)
  vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

  // Seed: NOA envelope completed
  const { rows: envRows } = await client.query<{ id: string }>(
    `INSERT INTO "${schemaName}".noa_envelopes
       (external_id, carrier_dot, factor_slug, provider, state, signed_at)
     VALUES (gen_random_uuid(), '5555555', 'apex-capital', 'hellosign', 'completed', now() - interval '10 days')
     RETURNING id`,
  );
  const envelopeId = envRows[0]!.id;

  // Seed: FoR active (carrier is in Active stage per precondition)
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, noa_envelope_id)
     VALUES ('5555555', 'apex-capital', 'Carrier 5555555', 'active', now() - interval '10 days', $1)`,
    [envelopeId],
  );

  // Seed: disbursement 5 days ago (carrier is in Active stage)
  const disbDate = new Date();
  disbDate.setUTCDate(disbDate.getUTCDate() - 5);
  const disbDateStr = disbDate.toISOString().slice(0, 10);

  await client.query(
    `INSERT INTO "${schemaName}".disbursements
       (factor_slug, carrier_dot, amount_cents, disbursed_at, source, status)
     VALUES ('apex-capital', '5555555', 1000000, $1, 'manual', 'observed')`,
    [disbDateStr],
  );
});

afterAll(async () => {
  await cleanup();
});

describe('markCarrierOffboarded action', () => {
  it('revokes FoR, sets revoked_at, writes audit log with reason in payload', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      const { markCarrierOffboarded } = await import('@/lib/pipeline/actions');

      // Verify precondition: carrier is currently active
      const { getPipelineCarriers } = await import('@/lib/pipeline/queries');
      const { computeCarrierStage } = await import('@/lib/pipeline/stage');

      const before = await getPipelineCarriers('apex-capital', { pool, schema: schemaName });
      const carrierBefore = before.find((c) => c.carrier_dot === '5555555');
      expect(carrierBefore).toBeDefined();
      expect(computeCarrierStage(carrierBefore!)).toBe('active');

      // Call the server action
      const result = await markCarrierOffboarded(
        {
          carrierDot: '5555555',
          factorSlug: 'apex-capital',
          reason: 'Test offboard reason',
        },
        { pool },
      );

      expect(result.success).toBe(true);
      expect(result.forId).toBeTruthy();

      // Assert: FoR row updated to status='revoked', revoked_at set
      const { rows: forRows } = await pool.query<{
        status: string;
        revoked_at: Date | null;
      }>(
        `SELECT status, revoked_at FROM "${schemaName}".factor_of_record
         WHERE carrier_dot = '5555555' AND factor_slug = 'apex-capital'
         ORDER BY assigned_at DESC LIMIT 1`,
      );
      expect(forRows[0]?.status).toBe('revoked');
      expect(forRows[0]?.revoked_at).not.toBeNull();

      // Assert: audit log row with event='for.revoked' and reason in payload
      const { rows: auditRows } = await pool.query<{
        event: string;
        payload: { reason: string };
        for_id: string;
      }>(
        `SELECT event, payload, for_id FROM "${schemaName}".factor_audit_log
         WHERE carrier_dot = '5555555' AND factor_slug = 'apex-capital' AND event = 'for.revoked'
         ORDER BY occurred_at DESC LIMIT 1`,
      );
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0]?.event).toBe('for.revoked');
      expect(auditRows[0]?.payload?.reason).toBe('Test offboard reason');
      expect(auditRows[0]?.for_id).toBe(result.forId);

      // Assert: subsequent pipeline render shows carrier in offboarded stage
      const after = await getPipelineCarriers('apex-capital', { pool, schema: schemaName });
      const carrierAfter = after.find((c) => c.carrier_dot === '5555555');
      expect(carrierAfter).toBeDefined();
      expect(computeCarrierStage(carrierAfter!)).toBe('offboarded');
    } finally {
      await pool.end();
    }
  });
});
