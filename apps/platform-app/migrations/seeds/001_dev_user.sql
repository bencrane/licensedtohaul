-- Dev seed: one auth user + one partner org + membership.
--
-- Apply with:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$HQX_DB_URL_POOLED" -f migrations/seeds/001_dev_user.sql'
--
-- Idempotency: this errors on re-run if the email already exists.
-- To re-seed, DELETE FROM auth.users WHERE email = 'test@licensedtohaul.com'
-- (cascades to lth.users, organization_memberships) and re-run.

DO $$
DECLARE
  v_user_id     uuid := gen_random_uuid();
  v_org_id      uuid := gen_random_uuid();
  v_lth_user_id uuid;
BEGIN
  -- 1. Auth user (email-confirmed, password hashed via pgcrypto bcrypt)
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
    'test@licensedtohaul.com',
    crypt('testing123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now(),
    '', '', '', '', ''
  );

  -- 2. Identity row (Supabase tracks auth providers separately)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', 'test@licensedtohaul.com',
      'email_verified', true
    ),
    'email', v_user_id::text,
    now(), now(), now()
  );

  -- 3. Partner org. The lth.users row was auto-created by the auth.users trigger.
  INSERT INTO lth.organizations (id, name, slug, category)
  VALUES (v_org_id, 'Apex Factoring (test)', 'apex-factoring', 'factoring');

  SELECT id INTO v_lth_user_id FROM lth.users WHERE auth_user_id = v_user_id;
  IF v_lth_user_id IS NULL THEN
    RAISE EXCEPTION 'lth.users mirror row was not created — check the auth.users trigger';
  END IF;

  -- 4. Membership: test user owns the partner org.
  INSERT INTO lth.organization_memberships (user_id, organization_id, role)
  VALUES (v_lth_user_id, v_org_id, 'owner');

  RAISE NOTICE 'Seeded: test@licensedtohaul.com / testing123!  (auth_user_id: %)', v_user_id;
  RAISE NOTICE 'Seeded org: apex-factoring  (org_id: %)', v_org_id;
END $$;
