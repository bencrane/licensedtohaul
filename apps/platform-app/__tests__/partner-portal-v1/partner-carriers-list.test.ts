// Test 4: partner carriers list — 3 active, 1 revoked
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

  // Seed: 3 active + 1 revoked FoR rows for apex-capital
  for (const dot of ['1111111', '2222222', '3333333']) {
    await client.query(
      `INSERT INTO "${schemaName}".factor_of_record
         (carrier_dot, factor_slug, factor_display_name, status, assigned_at)
       VALUES ($1, 'apex-capital', 'Apex Capital', 'active', now())`,
      [dot],
    );
  }
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, revoked_at)
     VALUES ('4444444', 'apex-capital', 'Apex Capital', 'revoked', now() - interval '30 days', now())`,
  );
});

afterAll(async () => {
  await cleanup();
});

describe('partner carriers list', () => {
  it('returns 3 active and 1 revoked carrier for apex-capital', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      const { rows } = await pool.query<{
        carrier_dot: string;
        status: string;
        assigned_at: Date;
        noa_state: string | null;
      }>(
        `SELECT f.carrier_dot, f.status, f.assigned_at, e.state AS noa_state
         FROM "${schemaName}".factor_of_record f
         LEFT JOIN "${schemaName}".noa_envelopes e ON e.id = f.noa_envelope_id
         WHERE f.factor_slug = 'apex-capital'
         ORDER BY f.assigned_at DESC`,
      );

      const active = rows.filter((r) => r.status === 'active');
      const revoked = rows.filter((r) => r.status === 'revoked');

      expect(active).toHaveLength(3);
      expect(revoked).toHaveLength(1);

      // Each active row has carrier_dot and assigned_at
      for (const r of active) {
        expect(r.carrier_dot).toBeTruthy();
        expect(r.assigned_at).toBeTruthy();
      }

      expect(revoked[0].carrier_dot).toBe('4444444');
    } finally {
      await pool.end();
    }
  });
});
