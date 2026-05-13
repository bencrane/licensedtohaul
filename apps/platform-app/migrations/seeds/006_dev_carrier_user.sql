-- Dev seed: carrier auth user + membership in test-carrier-ridgeline.
--
-- Creates carrier@licensedtohaul.com with password testing123! and links
-- them as owner of the test-carrier-ridgeline org (USDOT 1234567, seeded
-- in 002_dev_transfers.sql).
--
-- Apply with:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$HQX_DB_URL_POOLED" -f migrations/seeds/006_dev_carrier_user.sql'
--
-- Idempotency: the entire block is wrapped in an existence check so it is
-- safe to re-run. If carrier@licensedtohaul.com already exists, the auth
-- row inserts are skipped entirely and only the membership upsert runs.

DO $$
DECLARE
  v_user_id        uuid;
  v_carrier_org_id uuid;
  v_lth_user_id    uuid;
BEGIN
  -- 1. Check if the carrier auth user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'carrier@licensedtohaul.com';

  IF v_user_id IS NULL THEN
    -- First run: create the auth user
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      reauthentication_token
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'carrier@licensedtohaul.com',
      crypt('testing123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(),
      '', '', '', '', ''
    );

    -- Identity row (Supabase auth provider tracking)
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', 'carrier@licensedtohaul.com',
        'email_verified', true
      ),
      'email', v_user_id::text,
      now(), now(), now()
    );

    RAISE NOTICE 'Seeded auth user: carrier@licensedtohaul.com (auth_user_id: %)', v_user_id;
  ELSE
    RAISE NOTICE 'carrier@licensedtohaul.com already exists (auth_user_id: %) — skipping auth inserts', v_user_id;
  END IF;

  -- 2. Get the lth.users mirror row (created by the auth.users trigger on first run)
  SELECT id INTO v_lth_user_id FROM lth.users WHERE auth_user_id = v_user_id;
  IF v_lth_user_id IS NULL THEN
    -- Trigger may not have fired in all environments; insert directly
    INSERT INTO lth.users (auth_user_id, email)
    VALUES (v_user_id, 'carrier@licensedtohaul.com')
    ON CONFLICT (auth_user_id) DO NOTHING;
    SELECT id INTO v_lth_user_id FROM lth.users WHERE auth_user_id = v_user_id;
  END IF;

  IF v_lth_user_id IS NULL THEN
    RAISE EXCEPTION 'lth.users mirror row not found — check the auth.users trigger';
  END IF;

  -- 3. Get test-carrier-ridgeline org (seeded in 002_dev_transfers.sql)
  SELECT id INTO v_carrier_org_id FROM lth.organizations WHERE slug = 'test-carrier-ridgeline';
  IF v_carrier_org_id IS NULL THEN
    RAISE EXCEPTION 'test-carrier-ridgeline org not found — run 002_dev_transfers.sql first';
  END IF;

  -- 4. Membership: upsert so re-runs are idempotent
  INSERT INTO lth.organization_memberships (user_id, organization_id, role, status)
  VALUES (v_lth_user_id, v_carrier_org_id, 'owner', 'active')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET
    role   = 'owner',
    status = 'active';

  RAISE NOTICE 'Seeded: carrier@licensedtohaul.com / testing123!  (lth_user_id: %)', v_lth_user_id;
  RAISE NOTICE 'Membership: owner of test-carrier-ridgeline (org_id: %)', v_carrier_org_id;
END $$;
