export interface DealRoomThread {
  id: string;
  factor_slug: string;
  carrier_dot: string;
  created_at: Date;
}

export interface DealRoomMessage {
  id: string;
  thread_id: string;
  sender_side: 'carrier' | 'partner';
  body: string;
  created_at: Date;
}

export interface SendDealRoomMessageInput {
  carrierDot: string;
  factorSlug: string;
  body: string;
  senderSide: 'carrier' | 'partner';
}

export interface GetDealRoomMessagesInput {
  carrierDot: string;
  factorSlug: string;
}
