-- Partner-level default preferences (intake-time stuff).
-- Audience composer + catalog finalize read these as seed values, so the
-- partner doesn't re-pick excluded states / floors / hazmat preference
-- on every new audience.

ALTER TABLE lth.organizations
  ADD COLUMN IF NOT EXISTS partner_defaults jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN lth.organizations.partner_defaults IS
  'Partner-side defaults (excluded states/equipment, floors, hazmat, default window). Audience composer reads these as initial state.';
