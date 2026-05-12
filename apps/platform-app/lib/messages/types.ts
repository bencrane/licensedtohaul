export type SenderSide = 'partner' | 'carrier' | 'system';

export type Message = {
  id: string;
  thread_id: string;
  sender_user_id: string | null;
  sender_side: SenderSide;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type MessageThread = {
  id: string;
  transfer_id: string;
  created_at: string;
};

export type SendMessageState = {
  error: string | null;
};
