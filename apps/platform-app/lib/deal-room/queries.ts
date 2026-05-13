import { Pool } from 'pg';
import type { DealRoomThread, DealRoomMessage } from './types';

export async function getOrCreateThread(
  { carrierDot, factorSlug }: { carrierDot: string; factorSlug: string },
  opts: { pool: Pool; schema?: string },
): Promise<DealRoomThread> {
  const SCHEMA = opts.schema ?? process.env.LTH_SCHEMA ?? 'lth';
  const db = opts.pool;

  // Upsert: insert if not exists, return either way
  const { rows } = await db.query<DealRoomThread>(
    `INSERT INTO "${SCHEMA}".deal_room_threads (factor_slug, carrier_dot)
     VALUES ($1, $2)
     ON CONFLICT (factor_slug, carrier_dot) DO NOTHING
     RETURNING id, factor_slug, carrier_dot, created_at`,
    [factorSlug, carrierDot],
  );

  if (rows[0]) return rows[0];

  // Already existed — fetch it
  const { rows: existing } = await db.query<DealRoomThread>(
    `SELECT id, factor_slug, carrier_dot, created_at
     FROM "${SCHEMA}".deal_room_threads
     WHERE factor_slug = $1 AND carrier_dot = $2`,
    [factorSlug, carrierDot],
  );
  return existing[0]!;
}

export async function insertMessage(
  {
    threadId,
    senderSide,
    body,
  }: { threadId: string; senderSide: 'carrier' | 'partner'; body: string },
  opts: { pool: Pool; schema?: string },
): Promise<DealRoomMessage> {
  const SCHEMA = opts.schema ?? process.env.LTH_SCHEMA ?? 'lth';
  const db = opts.pool;

  const { rows } = await db.query<DealRoomMessage>(
    `INSERT INTO "${SCHEMA}".deal_room_messages (thread_id, sender_side, body)
     VALUES ($1, $2, $3)
     RETURNING id, thread_id, sender_side, body, created_at`,
    [threadId, senderSide, body],
  );
  return rows[0]!;
}

export async function getMessages(
  { carrierDot, factorSlug }: { carrierDot: string; factorSlug: string },
  opts: { pool: Pool; schema?: string },
): Promise<DealRoomMessage[]> {
  const SCHEMA = opts.schema ?? process.env.LTH_SCHEMA ?? 'lth';
  const db = opts.pool;

  const { rows } = await db.query<DealRoomMessage>(
    `SELECT m.id, m.thread_id, m.sender_side, m.body, m.created_at
     FROM "${SCHEMA}".deal_room_messages m
     JOIN "${SCHEMA}".deal_room_threads t ON t.id = m.thread_id
     WHERE t.factor_slug = $1 AND t.carrier_dot = $2
     ORDER BY m.created_at ASC`,
    [factorSlug, carrierDot],
  );
  return rows;
}
