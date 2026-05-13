-- Migration 006: factor workflow — NOA envelopes, FoR registry, audit log, billing events
-- Forward-only. Rollback is a follow-up migration.

-- Persistent envelopes (one per NOA send)
CREATE TABLE IF NOT EXISTS lth.noa_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id uuid NOT NULL UNIQUE,
  carrier_dot text NOT NULL,
  factor_slug text NOT NULL,
  load_id text,
  provider text NOT NULL,
  provider_envelope_id text,
  state text NOT NULL DEFAULT 'created',
  signed_at timestamptz,
  signer_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_noa_envelopes_carrier ON lth.noa_envelopes (carrier_dot);
CREATE INDEX IF NOT EXISTS idx_noa_envelopes_provider_id ON lth.noa_envelopes (provider, provider_envelope_id);

-- Factor of Record registry — historical, append-revoke pattern
CREATE TABLE IF NOT EXISTS lth.factor_of_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_dot text NOT NULL,
  factor_slug text NOT NULL,
  factor_display_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  noa_envelope_id uuid REFERENCES lth.noa_envelopes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_for_carrier_active ON lth.factor_of_record (carrier_dot) WHERE status = 'active';

-- Append-only audit log for factor-side events
CREATE TABLE IF NOT EXISTS lth.factor_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_dot text,
  factor_slug text,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  noa_envelope_id uuid REFERENCES lth.noa_envelopes(id),
  for_id uuid REFERENCES lth.factor_of_record(id),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_factor_audit_carrier ON lth.factor_audit_log (carrier_dot, occurred_at DESC);

-- Pending Stripe Billing usage events — emitted async by a worker
CREATE TABLE IF NOT EXISTS lth.factor_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_slug text NOT NULL,
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  emitted boolean NOT NULL DEFAULT false,
  emitted_at timestamptz,
  stripe_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_events_pending ON lth.factor_billing_events (factor_slug, created_at) WHERE emitted = false;

-- Stripe customer + meter mappings per factor
CREATE TABLE IF NOT EXISTS lth.factor_stripe_customers (
  factor_slug text PRIMARY KEY,
  stripe_customer_id text NOT NULL,
  stripe_meter_id_noa_transition text,
  stripe_meter_id_submission_cleared text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
