-- Licensed to Haul: in-app messaging tied to transfers.
--
-- One thread per transfer (1:1). Lazy-created when the first message lands.
-- Carrier replies arrive via email inbound parse (Phase 5); for now, partners
-- send and we store. The carrier side has no LtH account yet.

CREATE TABLE lth.message_threads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id  uuid NOT NULL UNIQUE REFERENCES lth.transfers(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX message_threads_transfer_idx ON lth.message_threads (transfer_id);

CREATE TABLE lth.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES lth.message_threads(id) ON DELETE CASCADE,
  sender_user_id  uuid REFERENCES lth.users(id) ON DELETE SET NULL,
  sender_side     text NOT NULL CHECK (sender_side IN ('partner','carrier','system')),
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);

CREATE INDEX messages_thread_created_idx ON lth.messages (thread_id, created_at);
