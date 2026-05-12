'use server';

import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/audience-specs/db';
import { createClient } from '@/lib/supabase/server';
import type { Message, SendMessageState, ThreadPreview } from './types';

/**
 * Returns the thread for a transfer, creating it on first call. Lazy because
 * most transfers never get a message.
 */
async function getOrCreateThreadId(transferId: string): Promise<string> {
  const existing = await pool().query<{ id: string }>(
    'SELECT id FROM lth.message_threads WHERE transfer_id = $1',
    [transferId],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await pool().query<{ id: string }>(
    `INSERT INTO lth.message_threads (transfer_id) VALUES ($1)
     ON CONFLICT (transfer_id) DO UPDATE SET transfer_id = EXCLUDED.transfer_id
     RETURNING id`,
    [transferId],
  );
  return inserted.rows[0].id;
}

type DBThreadPreview = {
  transfer_id: string;
  contact_snapshot: { name: string; usdot: number; domicile: string };
  disposition: string;
  last_body: string;
  last_at: string;
  last_sender: ThreadPreview['last_sender'];
  unread_count: number;
};

/**
 * Recent message activity across every transfer owned by the partner org.
 * One row per thread, ordered by most-recent message first. Threads without
 * any messages are excluded (LATERAL join requires at least one row).
 */
export async function listThreadPreviewsForOrg(slug: string): Promise<ThreadPreview[]> {
  const { rows: orgRows } = await pool().query<{ id: string }>(
    'SELECT id FROM lth.organizations WHERE slug = $1',
    [slug],
  );
  const orgId = orgRows[0]?.id;
  if (!orgId) return [];

  const { rows } = await pool().query<DBThreadPreview>(
    `SELECT
        t.id::text AS transfer_id,
        t.contact_snapshot,
        t.disposition,
        m.body AS last_body,
        m.created_at AS last_at,
        m.sender_side AS last_sender,
        COALESCE(unread.count, 0) AS unread_count
       FROM lth.message_threads th
       JOIN lth.transfers t ON t.id = th.transfer_id
       JOIN LATERAL (
         SELECT body, created_at, sender_side
           FROM lth.messages
          WHERE thread_id = th.id
          ORDER BY created_at DESC
          LIMIT 1
       ) m ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS count
           FROM lth.messages
          WHERE thread_id = th.id
            AND sender_side = 'carrier'
            AND read_at IS NULL
       ) unread ON true
      WHERE t.partner_org_id = $1
      ORDER BY m.created_at DESC`,
    [orgId],
  );

  return rows.map((r) => ({
    transfer_id: r.transfer_id,
    carrier_name: r.contact_snapshot.name,
    carrier_usdot: r.contact_snapshot.usdot,
    carrier_domicile: r.contact_snapshot.domicile,
    disposition: r.disposition,
    last_body: r.last_body,
    last_at: r.last_at,
    last_sender: r.last_sender,
    unread_count: r.unread_count,
  }));
}

export async function listMessagesForTransfer(transferId: string): Promise<Message[]> {
  const { rows } = await pool().query<Message>(
    `SELECT m.id, m.thread_id, m.sender_user_id, m.sender_side, m.body, m.created_at, m.read_at
       FROM lth.message_threads t
       JOIN lth.messages m ON m.thread_id = t.id
      WHERE t.transfer_id = $1
      ORDER BY m.created_at ASC`,
    [transferId],
  );
  return rows;
}

export async function sendMessage(
  slug: string,
  transferId: string,
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { error: 'Message cannot be empty.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  // Look up the LtH user id for the auth user.
  const userRow = await pool().query<{ id: string }>(
    'SELECT id FROM lth.users WHERE auth_user_id = $1',
    [user.id],
  );
  const senderUserId = userRow.rows[0]?.id ?? null;

  const threadId = await getOrCreateThreadId(transferId);

  await pool().query(
    `INSERT INTO lth.messages (thread_id, sender_user_id, sender_side, body)
     VALUES ($1, $2, 'partner', $3)`,
    [threadId, senderUserId, body],
  );

  revalidatePath(`/partner/${slug}/transfers/${transferId}`);
  return { error: null };
}
