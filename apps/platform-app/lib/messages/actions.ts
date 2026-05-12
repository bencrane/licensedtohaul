'use server';

import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/audience-specs/db';
import { createClient } from '@/lib/supabase/server';
import type { Message, SendMessageState } from './types';

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
