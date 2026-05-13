-- Licensed to Haul: factor intake profiles
--
-- One row per factoring org. Replaces the audience_specs model for factoring
-- partners. Partners configure their intake criteria, terms, and display copy
-- here; carriers see the resulting cards on /dashboard/[dot]/financing.
--
-- Apply via:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$HQX_DB_URL_POOLED" -f migrations/006_factor_profiles.sql'

CREATE TABLE lth.factor_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL UNIQUE REFERENCES lth.organizations(id) ON DELETE CASCADE,
  -- Intake criteria (structured as JSONB so we can evolve without migrations)
  -- Expected shape: { states: string[], equipment_classes: string[],
  --   fleet_size_min: int, fleet_size_max: int, authority_age_min_years: int,
  --   hazmat_ok: bool, fuel_card_addon: bool }
  criteria     jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Rejection / exclusion rules
  exclusions   jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Factoring terms surfaced on the carrier financing card
  -- Expected shape: { advance_rate_pct: number, factoring_rate_pct: number,
  --   recourse: "recourse" | "non-recourse", funding_speed: string,
  --   monthly_minimum_usd: number | null, fuel_card_addon: bool,
  --   fuel_card_description: string | null }
  terms        jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Free-form marketing copy shown in the card header / body
  display_copy text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Carrier-side lookup: all active factoring orgs joined to their profile
CREATE INDEX factor_profiles_org_idx ON lth.factor_profiles (org_id);

-- updated_at autotouch (reuse the existing trigger function defined in 002_audience_specs.sql)
DROP TRIGGER IF EXISTS factor_profiles_touch_updated_at ON lth.factor_profiles;
CREATE TRIGGER factor_profiles_touch_updated_at
  BEFORE UPDATE ON lth.factor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION lth.touch_updated_at();
