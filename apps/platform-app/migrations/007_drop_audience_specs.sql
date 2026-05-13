-- Licensed to Haul: drop audience_specs (replaced by factor_profiles)
--
-- Drops the FK column on transfers first, then the audience_specs table.
-- Forward-only. No _down.sql.
--
-- Apply via:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$HQX_DB_URL_POOLED" -f migrations/007_drop_audience_specs.sql'

-- 1. Drop the FK constraint added in 002_audience_specs.sql
ALTER TABLE lth.transfers
  DROP CONSTRAINT IF EXISTS transfers_audience_spec_fk;

-- 2. Drop the column (now constraint-free)
ALTER TABLE lth.transfers
  DROP COLUMN IF EXISTS audience_spec_id;

-- 3. Drop the table and all its indexes (CASCADE drops the index created in 002)
DROP TABLE IF EXISTS lth.audience_specs CASCADE;

-- 4. The partner_defaults column on lth.organizations (migration 005) stays —
--    it's generic org config, not audience-specs-specific.
