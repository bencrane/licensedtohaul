-- Dev seed: partner org + membership for the pre-seeded factor auth user.
--
-- The auth user `seed-factor-1@licensedtohaul.test` is created out-of-band
-- (Supabase dashboard / seed script run by the operator). This seed creates
-- the lth.organizations row for apex-factoring and links the existing user
-- to it as owner.
--
-- Apply with:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$LTH_DB_POOLED_URL" -f migrations/seeds/001_dev_user.sql'
--
-- Idempotent: safe to re-run; uses ON CONFLICT for all inserts.

DO $$
DECLARE
  v_auth_user_id uuid;
  v_lth_user_id  uuid;
  v_org_id       uuid;
BEGIN
  -- 1. Resolve the pre-seeded factor auth user.
  SELECT id INTO v_auth_user_id FROM auth.users
   WHERE email = 'seed-factor-1@licensedtohaul.test';
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'auth.users row for seed-factor-1@licensedtohaul.test is missing — seed the auth user first';
  END IF;

  -- 2. Make sure the lth.users mirror row exists (trigger only fires on
  --    future inserts; existing users need a manual backfill).
  INSERT INTO lth.users (auth_user_id, email)
  VALUES (v_auth_user_id, 'seed-factor-1@licensedtohaul.test')
  ON CONFLICT (auth_user_id) DO NOTHING;
  SELECT id INTO v_lth_user_id FROM lth.users WHERE auth_user_id = v_auth_user_id;

  -- 3. Create apex-factoring org (idempotent).
  INSERT INTO lth.organizations (name, slug, category)
  VALUES ('Apex Factoring (test)', 'apex-factoring', 'factoring')
  ON CONFLICT (slug) DO UPDATE SET category = 'factoring';
  SELECT id INTO v_org_id FROM lth.organizations WHERE slug = 'apex-factoring';

  -- 4. Membership: factor user owns apex-factoring.
  INSERT INTO lth.organization_memberships (user_id, organization_id, role, status)
  VALUES (v_lth_user_id, v_org_id, 'owner', 'active')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'owner', status = 'active';

  RAISE NOTICE 'Seeded: seed-factor-1@licensedtohaul.test → apex-factoring (owner)  org_id=%, user_id=%', v_org_id, v_lth_user_id;
END $$;
