-- Migration 007: partner portal rebuild — deal room, disbursements, billing config
-- Forward-only. Per validator: text FKs throughout (no lth.organizations dependency).

-- Deal room: per-(carrier × factor) message thread.
-- Use opaque text identifiers (factor_slug, carrier_dot), matching the v1 pattern.
CREATE TABLE IF NOT EXISTS lth.deal_room_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_slug text NOT NULL,
  carrier_dot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (factor_slug, carrier_dot)
);

CREATE TABLE IF NOT EXISTS lth.deal_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES lth.deal_room_threads(id) ON DELETE CASCADE,
  sender_side text NOT NULL CHECK (sender_side IN ('carrier','partner')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_room_messages_thread ON lth.deal_room_messages (thread_id, created_at);

-- Disbursements observed by the platform
CREATE TABLE IF NOT EXISTS lth.disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_slug text NOT NULL,
  carrier_dot text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  disbursed_at date NOT NULL,
  reference_id text,
  source text NOT NULL CHECK (source IN ('manual','webhook')),
  status text NOT NULL DEFAULT 'observed' CHECK (status IN ('observed','reversed')),
  observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disbursements_factor_quarter
  ON lth.disbursements (factor_slug, disbursed_at);

-- Per-factor billing config (overrides defaults)
CREATE TABLE IF NOT EXISTS lth.factor_billing_config (
  factor_slug text PRIMARY KEY,
  platform_fee_cents bigint NOT NULL DEFAULT 250000,  -- $2,500/quarter
  disbursement_bps integer NOT NULL DEFAULT 50,        -- 50 bps = 0.5%
  billing_cycle_anchor date NOT NULL DEFAULT date_trunc('quarter', now())::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Extend factor_stripe_customers with the disbursement-skim meter ID + subscription
ALTER TABLE lth.factor_stripe_customers
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_meter_id_disbursement_skim text;

-- Drop deprecated tables (zero rows confirmed by validator pre-flight)
DROP TABLE IF EXISTS lth.audience_specs CASCADE;
DROP TABLE IF EXISTS lth.message_threads CASCADE;

-- Mark lth.transfers as deprecated (conditional — table may not exist in test schemas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = current_schema()
    AND tablename = 'transfers'
  ) THEN
    EXECUTE 'COMMENT ON TABLE ' || quote_ident(current_schema()) || '.transfers IS ''DEPRECATED — lead-broker model. Slated for removal in cycle 3+.''';
  END IF;
END $$;
