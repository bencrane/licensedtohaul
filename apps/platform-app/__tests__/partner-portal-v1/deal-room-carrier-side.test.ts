// Test 6: deal room carrier side — symmetric view
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

  // Same seed as Test 5
  const { rows: envRows } = await client.query<{ id: string }>(
    `INSERT INTO "${schemaName}".noa_envelopes
       (external_id, carrier_dot, factor_slug, provider, state)
     VALUES (gen_random_uuid(), '1234567', 'apex-capital', 'fake', 'completed')
     RETURNING id`,
  );
  const envId = envRows[0].id;

  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, noa_envelope_id)
     VALUES ('1234567', 'apex-capital', 'Apex Capital', 'active', now(), $1)`,
    [envId],
  );

  const { rows: threadRows } = await client.query<{ id: string }>(
    `INSERT INTO "${schemaName}".deal_room_threads (factor_slug, carrier_dot)
     VALUES ('apex-capital', '1234567')
     RETURNING id`,
  );
  const threadId = threadRows[0].id;

  await client.query(
    `INSERT INTO "${schemaName}".deal_room_messages (thread_id, sender_side, body)
     VALUES ($1, 'partner', 'Hello from the factor'),
            ($1, 'carrier', 'Hello from the carrier')`,
    [threadId],
  );
});

afterAll(async () => {
  await cleanup();
});

describe('deal room carrier side', () => {
  it('carrier can see same FoR + NOA and 2 messages', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.LTH_DB_POOLED_URL!, max: 1 });

    try {
      // From carrier perspective: active FoR for apex-capital
      const { rows: forRows } = await pool.query<{ status: string; factor_slug: string }>(
        `SELECT f.status, f.factor_slug
         FROM "${schemaName}".factor_of_record f
         WHERE f.carrier_dot = '1234567' AND f.factor_slug = 'apex-capital' AND f.status = 'active'`,
      );
      expect(forRows).toHaveLength(1);
      expect(forRows[0].factor_slug).toBe('apex-capital');

      // Messages visible to carrier
      const { rows: msgRows } = await pool.query(
        `SELECT m.body, m.sender_side
         FROM "${schemaName}".deal_room_messages m
         JOIN "${schemaName}".deal_room_threads t ON t.id = m.thread_id
         WHERE t.carrier_dot = '1234567' AND t.factor_slug = 'apex-capital'
         ORDER BY m.created_at ASC`,
      );
      expect(msgRows).toHaveLength(2);
    } finally {
      await pool.end();
    }
  });

  it('factor display name is "Apex Capital" for slug apex-capital', async () => {
    const { getFactorDisplayName } = await import('@/lib/factor-of-record/types');
    expect(getFactorDisplayName('apex-capital')).toBe('Apex Capital');
  });

  it('carrier deal room page module is importable', async () => {
    const mod = await import('@/app/dashboard/[dot]/financing/[factorSlug]/page');
    expect(typeof mod.default).toBe('function');
  });
});
