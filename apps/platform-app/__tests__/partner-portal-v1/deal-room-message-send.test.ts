// Test 7: sendDealRoomMessage creates message in DB; getDealRoomMessages returns it
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

  // Seed FoR (required for context; thread has no FK to FoR but good practice)
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at)
     VALUES ('9876543', 'apex-capital', 'Apex Capital', 'active', now())`,
  );
});

afterAll(async () => {
  await cleanup();
});

describe('sendDealRoomMessage + getDealRoomMessages', () => {
  it('creates a deal_room_messages row and getDealRoomMessages returns 1 message', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.HQX_DB_URL_POOLED!, max: 1 });

    try {
      const { sendDealRoomMessage, getDealRoomMessages } = await import('@/lib/deal-room/actions');

      // Send a message from the partner side
      const msg = await sendDealRoomMessage(
        { carrierDot: '9876543', factorSlug: 'apex-capital', body: 'Welcome!', senderSide: 'partner' },
        { pool: pool as unknown as import('pg').Pool },
      );

      expect(msg.id).toBeTruthy();
      expect(msg.body).toBe('Welcome!');
      expect(msg.sender_side).toBe('partner');

      // Verify DB row exists
      const { rows: dbRows } = await client.query(
        `SELECT id, body, sender_side, thread_id
         FROM "${schemaName}".deal_room_messages
         WHERE id = $1`,
        [msg.id],
      );
      expect(dbRows).toHaveLength(1);
      expect(dbRows[0].body).toBe('Welcome!');
      expect(dbRows[0].sender_side).toBe('partner');

      // Verify thread_id resolves to the (carrier, factor) pair
      const { rows: threadRows } = await client.query(
        `SELECT factor_slug, carrier_dot
         FROM "${schemaName}".deal_room_threads
         WHERE id = $1`,
        [dbRows[0].thread_id],
      );
      expect(threadRows[0].factor_slug).toBe('apex-capital');
      expect(threadRows[0].carrier_dot).toBe('9876543');

      // getDealRoomMessages returns the 1 message
      const messages = await getDealRoomMessages(
        { carrierDot: '9876543', factorSlug: 'apex-capital' },
        { pool: pool as unknown as import('pg').Pool },
      );
      expect(messages).toHaveLength(1);
      expect(messages[0].body).toBe('Welcome!');
    } finally {
      await pool.end();
    }
  });
});
