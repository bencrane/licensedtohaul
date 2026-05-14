-- Dev seed: carrier membership for the pre-seeded carrier auth user.
--
-- The auth user `seed-carrier-1@licensedtohaul.test` is created out-of-band.
-- This seed creates the lth.users mirror row (if missing) and links the
-- carrier to test-carrier-ridgeline (seeded in 002_dev_transfers.sql) as
-- owner.
--
-- Apply with:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$LTH_DB_POOLED_URL" -f migrations/seeds/006_dev_carrier_user.sql'
--
-- Idempotent: safe to re-run.

DO $$
DECLARE
  v_auth_user_id   uuid;
  v_lth_user_id    uuid;
  v_carrier_org_id uuid;
BEGIN
  -- 1. Resolve the pre-seeded carrier auth user.
  SELECT id INTO v_auth_user_id FROM auth.users
   WHERE email = 'seed-carrier-1@licensedtohaul.test';
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'auth.users row for seed-carrier-1@licensedtohaul.test is missing — seed the auth user first';
  END IF;

  -- 2. Ensure lth.users mirror exists.
  INSERT INTO lth.users (auth_user_id, email)
  VALUES (v_auth_user_id, 'seed-carrier-1@licensedtohaul.test')
  ON CONFLICT (auth_user_id) DO NOTHING;
  SELECT id INTO v_lth_user_id FROM lth.users WHERE auth_user_id = v_auth_user_id;

  -- 3. Resolve the test-carrier-ridgeline org (seeded in 002).
  SELECT id INTO v_carrier_org_id FROM lth.organizations
   WHERE slug = 'test-carrier-ridgeline';
  IF v_carrier_org_id IS NULL THEN
    RAISE EXCEPTION 'test-carrier-ridgeline org not found — run 002_dev_transfers.sql first';
  END IF;

  -- 4. Membership: carrier user owns the test carrier org.
  INSERT INTO lth.organization_memberships (user_id, organization_id, role, status)
  VALUES (v_lth_user_id, v_carrier_org_id, 'owner', 'active')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'owner', status = 'active';

  RAISE NOTICE 'Seeded: seed-carrier-1@licensedtohaul.test → test-carrier-ridgeline (owner)  org_id=%, user_id=%', v_carrier_org_id, v_lth_user_id;
END $$;
