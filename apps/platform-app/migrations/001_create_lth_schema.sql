-- Licensed to Haul: initial schema (lth.*)
--
-- Lives in the same Supabase project as hq-x (HQX_DB_URL_POOLED).
-- Apply via: doppler run -- psql "$HQX_DB_URL_POOLED" -f 001_create_lth_schema.sql
--
-- Conventions:
--   - One organizations table, flattened (no `kind` discriminator).
--   - `category` is plain text — canonical values listed in comments, no CHECK constraint
--     (so we can expand the set without a migration).
--   - Carriers and brokerages can both have FMCSA data and a subscription;
--     subscriptions reference any org without further constraint.
--   - User-to-user message threads are deliberately deferred — the v1 UI is
--     system notifications (inbox archive) + CRM transfers, no DMs.

CREATE SCHEMA IF NOT EXISTS lth;

------------------------------------------------------------------------
-- Organizations
------------------------------------------------------------------------
-- One row per business entity on the platform. Carriers, brokers, factoring
-- companies, insurance, shippers — all share this table. FMCSA fields are
-- NULL for non-FMCSA-registered entities (factoring, insurance, shippers).
-- Stripe customer id is NULL for free orgs (most pure carriers).
--
-- Canonical category values: carrier, broker, factoring, insurance, shipper.
-- Add more by INSERT — no migration needed.
CREATE TABLE lth.organizations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  slug                text UNIQUE,
  category            text NOT NULL,
  -- FMCSA fields (NULL when category has no FMCSA authority)
  usdot               bigint UNIQUE,
  mc_number           text,
  authority_types     text[],
  legal_name          text,
  dba                 text,
  claimed_at          timestamptz,
  fmcsa_snapshot      jsonb,
  fmcsa_snapshot_at   timestamptz,
  -- Billing (NULL for free orgs)
  stripe_customer_id  text UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now()
);

------------------------------------------------------------------------
-- Users
------------------------------------------------------------------------
-- Mirror of auth.users (Supabase). One row per platform user.
-- Auto-created via trigger on auth.users insert (see end of file).
CREATE TABLE lth.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

------------------------------------------------------------------------
-- Organization memberships
------------------------------------------------------------------------
CREATE TABLE lth.organization_memberships (
  user_id          uuid NOT NULL REFERENCES lth.users(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES lth.organizations(id) ON DELETE CASCADE,
  role             text NOT NULL CHECK (role IN ('owner','admin','member')),
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX organization_memberships_org_idx
  ON lth.organization_memberships (organization_id);

------------------------------------------------------------------------
-- Invitations
------------------------------------------------------------------------
-- Cold-email magic-link onboarding. The URL carries a raw token; we store
-- only the SHA-256 hash. When consumed, links to the auth user that claimed it.
CREATE TABLE lth.invitations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash           text NOT NULL UNIQUE,
  target_email         text NOT NULL,
  target_usdot         bigint,
  target_role          text NOT NULL DEFAULT 'owner',
  invited_by_user_id   uuid REFERENCES lth.users(id),
  expires_at           timestamptz NOT NULL,
  consumed_at          timestamptz,
  consumed_by_user_id  uuid REFERENCES lth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invitations_target_email_idx ON lth.invitations (target_email);
CREATE INDEX invitations_expires_at_idx   ON lth.invitations (expires_at)
  WHERE consumed_at IS NULL;

------------------------------------------------------------------------
-- Connections (org ↔ org handshake)
------------------------------------------------------------------------
-- When a partner clicks "Connect" on a carrier, a row goes here as 'pending'.
-- A corresponding notification surfaces to the carrier with accept/decline.
CREATE TABLE lth.connections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiating_org_id   uuid NOT NULL REFERENCES lth.organizations(id) ON DELETE CASCADE,
  receiving_org_id    uuid NOT NULL REFERENCES lth.organizations(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','declined','revoked')),
  message_to_carrier  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  responded_at        timestamptz,
  UNIQUE (initiating_org_id, receiving_org_id)
);

CREATE INDEX connections_receiving_org_idx ON lth.connections (receiving_org_id, status);

------------------------------------------------------------------------
-- Notifications (carrier inbox archive + partner activity feed)
------------------------------------------------------------------------
-- System-generated. Categories match the existing UI:
--   compliance, freight, insurance, financing, equipment, safety,
--   authority, system, connection.
-- `emailed_at` records when the corresponding Resend email went out
-- (NULL = in-app only).
CREATE TABLE lth.notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id  uuid NOT NULL REFERENCES lth.users(id) ON DELETE CASCADE,
  category           text NOT NULL,
  subject            text NOT NULL,
  body               text NOT NULL,
  from_name          text,
  from_email         text,
  primary_action     jsonb,
  is_read            boolean NOT NULL DEFAULT false,
  is_important       boolean NOT NULL DEFAULT false,
  emailed_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_idx
  ON lth.notifications (recipient_user_id, created_at DESC);
CREATE INDEX notifications_unread_idx
  ON lth.notifications (recipient_user_id) WHERE is_read = false;

------------------------------------------------------------------------
-- Notification preferences (per user, per category)
------------------------------------------------------------------------
CREATE TABLE lth.notification_preferences (
  user_id   uuid NOT NULL REFERENCES lth.users(id) ON DELETE CASCADE,
  category  text NOT NULL,
  cadence   text NOT NULL CHECK (cadence IN ('immediate','daily_digest','weekly_digest','off')),
  PRIMARY KEY (user_id, category)
);

------------------------------------------------------------------------
-- Transfers (partner CRM pipeline)
------------------------------------------------------------------------
-- Each row = one carrier match in a partner's funnel.
-- `match_criteria` / `signals` / `contact_snapshot` captured at match time.
CREATE TABLE lth.transfers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_org_id    uuid NOT NULL REFERENCES lth.organizations(id) ON DELETE CASCADE,
  carrier_org_id    uuid NOT NULL REFERENCES lth.organizations(id) ON DELETE CASCADE,
  audience_spec_id  uuid,
  disposition       text NOT NULL DEFAULT 'new'
                    CHECK (disposition IN ('new','contacted','quoted','won','lost','rejected')),
  match_criteria    jsonb,
  signals           jsonb,
  contact_snapshot  jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  contacted_at      timestamptz,
  quoted_at         timestamptz,
  closed_at         timestamptz
);

CREATE INDEX transfers_partner_idx
  ON lth.transfers (partner_org_id, disposition, created_at DESC);
CREATE INDEX transfers_carrier_idx
  ON lth.transfers (carrier_org_id);

------------------------------------------------------------------------
-- Subscriptions (billing — partners only in practice, but no constraint)
------------------------------------------------------------------------
CREATE TABLE lth.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES lth.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id  text UNIQUE,
  plan                    text NOT NULL,
  status                  text NOT NULL,
  period_start            timestamptz,
  period_end              timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_org_idx ON lth.subscriptions (organization_id);

------------------------------------------------------------------------
-- Audit log
------------------------------------------------------------------------
CREATE TABLE lth.audit_log (
  id             bigserial PRIMARY KEY,
  actor_user_id  uuid REFERENCES lth.users(id) ON DELETE SET NULL,
  action         text NOT NULL,
  target_type    text,
  target_id      text,
  payload        jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_actor_idx   ON lth.audit_log (actor_user_id, created_at DESC);
CREATE INDEX audit_log_created_idx ON lth.audit_log (created_at DESC);

------------------------------------------------------------------------
-- Auto-create lth.users on auth.users insert
------------------------------------------------------------------------
-- SECURITY DEFINER so the trigger can write to lth.* regardless of caller.
-- Idempotent: skips if the auth_user_id is already mirrored.
CREATE OR REPLACE FUNCTION lth.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = lth, public
AS $$
BEGIN
  INSERT INTO lth.users (auth_user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_for_lth ON auth.users;
CREATE TRIGGER on_auth_user_created_for_lth
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION lth.handle_new_auth_user();
