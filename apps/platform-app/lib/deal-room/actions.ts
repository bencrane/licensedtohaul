import { Pool } from 'pg';
import type { SendDealRoomMessageInput, GetDealRoomMessagesInput, DealRoomMessage } from './types';
import { getOrCreateThread, insertMessage, getMessages } from './queries';

function getPool(): Pool {
  const connString = process.env.LTH_DB_POOLED_URL;
  if (!connString) throw new Error('LTH_DB_POOLED_URL not set');
  return new Pool({ connectionString: connString, max: 4 });
}

let _pool: Pool | null = null;
function defaultPool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

export async function sendDealRoomMessage(
  input: SendDealRoomMessageInput,
  opts?: { pool?: Pool },
): Promise<DealRoomMessage> {
  const db = opts?.pool ?? defaultPool();

  const thread = await getOrCreateThread(
    { carrierDot: input.carrierDot, factorSlug: input.factorSlug },
    { pool: db },
  );

  return insertMessage(
    { threadId: thread.id, senderSide: input.senderSide, body: input.body },
    { pool: db },
  );
}

export async function getDealRoomMessages(
  input: GetDealRoomMessagesInput,
  opts?: { pool?: Pool },
): Promise<DealRoomMessage[]> {
  const db = opts?.pool ?? defaultPool();
  return getMessages({ carrierDot: input.carrierDot, factorSlug: input.factorSlug }, { pool: db });
}

export type { DealRoomMessage, DealRoomThread } from './types';
