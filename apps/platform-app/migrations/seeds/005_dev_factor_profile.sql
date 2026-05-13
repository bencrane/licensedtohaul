-- Dev seed: factor profiles for all factoring orgs.
--
-- Creates rts-financial and tbs-factoring orgs (apex-factoring may already exist
-- from seed 001). Inserts one factor_profiles row per org.
-- Also ensures test@licensedtohaul.com has an active membership in apex-factoring.
--
-- Apply with:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$HQX_DB_URL_POOLED" -f migrations/seeds/005_dev_factor_profile.sql'
--
-- Idempotency: uses ON CONFLICT for all inserts. Safe to re-run.

DO $$
DECLARE
  v_apex_id              uuid;
  v_rts_id               uuid;
  v_tbs_id               uuid;
  v_partner_lth_user_id  uuid;
BEGIN
  -- 1. Get or create apex-factoring org
  SELECT id INTO v_apex_id FROM lth.organizations WHERE slug = 'apex-factoring';
  IF v_apex_id IS NULL THEN
    INSERT INTO lth.organizations (name, slug, category)
    VALUES ('Apex Factoring (test)', 'apex-factoring', 'factoring');
    SELECT id INTO v_apex_id FROM lth.organizations WHERE slug = 'apex-factoring';
    RAISE NOTICE 'Created apex-factoring org (org_id: %)', v_apex_id;
  ELSE
    UPDATE lth.organizations SET category = 'factoring' WHERE id = v_apex_id AND category != 'factoring';
    RAISE NOTICE 'apex-factoring org exists (org_id: %)', v_apex_id;
  END IF;

  -- 2. Ensure test@licensedtohaul.com is a member of apex-factoring
  SELECT u.id INTO v_partner_lth_user_id
    FROM lth.users u
    JOIN auth.users au ON au.id = u.auth_user_id
   WHERE au.email = 'test@licensedtohaul.com';

  IF v_partner_lth_user_id IS NOT NULL THEN
    INSERT INTO lth.organization_memberships (user_id, organization_id, role, status)
    VALUES (v_partner_lth_user_id, v_apex_id, 'owner', 'active')
    ON CONFLICT (user_id, organization_id) DO UPDATE SET role='owner', status='active';
    RAISE NOTICE 'Ensured test@licensedtohaul.com → apex-factoring (owner)';
  END IF;

  -- 3. Seed rts-financial org (idempotent)
  INSERT INTO lth.organizations (name, slug, category)
  VALUES ('RTS Financial (test)', 'rts-financial', 'factoring')
  ON CONFLICT (slug) DO NOTHING;
  SELECT id INTO v_rts_id FROM lth.organizations WHERE slug = 'rts-financial';

  -- 4. Seed tbs-factoring org (idempotent)
  INSERT INTO lth.organizations (name, slug, category)
  VALUES ('TBS Factoring (test)', 'tbs-factoring', 'factoring')
  ON CONFLICT (slug) DO NOTHING;
  SELECT id INTO v_tbs_id FROM lth.organizations WHERE slug = 'tbs-factoring';

  -- 5. Insert factor_profiles for all three orgs (upsert)

  -- Apex Factoring
  INSERT INTO lth.factor_profiles (org_id, criteria, exclusions, terms, display_copy)
  VALUES (
    v_apex_id,
    '{
      "states": ["TX","OK","NM","AR","LA","CO","KS","MO"],
      "equipment_classes": ["Dry van","Reefer","Flatbed","Tanker"],
      "fleet_size_min": 3,
      "fleet_size_max": 50,
      "authority_age_min_years": 1,
      "hazmat_ok": true,
      "fuel_card_addon": true
    }'::jsonb,
    '{"no_passenger": true}'::jsonb,
    '{
      "advance_rate_pct": 90,
      "factoring_rate_pct": 2.5,
      "recourse": "non-recourse",
      "funding_speed": "Same-day ACH",
      "monthly_minimum_usd": null,
      "fuel_card_addon": true,
      "fuel_card_description": "Comdata fuel card included — save $0.40+ per gallon at 1,300+ stops"
    }'::jsonb,
    'Apex Factoring funds TX-region fleets from 3 to 50 power units. Same-day ACH, non-recourse, no long-term contract. Includes free Comdata fuel card.'
  )
  ON CONFLICT (org_id) DO UPDATE SET
    criteria     = EXCLUDED.criteria,
    exclusions   = EXCLUDED.exclusions,
    terms        = EXCLUDED.terms,
    display_copy = EXCLUDED.display_copy,
    updated_at   = now();

  -- RTS Financial
  INSERT INTO lth.factor_profiles (org_id, criteria, exclusions, terms, display_copy)
  VALUES (
    v_rts_id,
    '{
      "states": ["TX","OK","NM","AR","LA","MS","AL","TN","GA","FL"],
      "equipment_classes": ["Dry van","Reefer","Flatbed"],
      "fleet_size_min": 5,
      "fleet_size_max": 100,
      "authority_age_min_years": 2,
      "hazmat_ok": false,
      "fuel_card_addon": true
    }'::jsonb,
    '{"no_passenger": true}'::jsonb,
    '{
      "advance_rate_pct": 93,
      "factoring_rate_pct": 2.5,
      "recourse": "non-recourse",
      "funding_speed": "Same-day",
      "monthly_minimum_usd": 50000,
      "fuel_card_addon": true,
      "fuel_card_description": "Free fuel advance program — up to 40% on covered loads"
    }'::jsonb,
    'RTS Financial: 93% same-day advances, non-recourse. $50K monthly minimum. Includes fuel advance program for covered loads. Southeast and South-Central focus.'
  )
  ON CONFLICT (org_id) DO UPDATE SET
    criteria     = EXCLUDED.criteria,
    exclusions   = EXCLUDED.exclusions,
    terms        = EXCLUDED.terms,
    display_copy = EXCLUDED.display_copy,
    updated_at   = now();

  -- TBS Factoring
  INSERT INTO lth.factor_profiles (org_id, criteria, exclusions, terms, display_copy)
  VALUES (
    v_tbs_id,
    '{
      "states": ["TX","OK","NM","AR","LA","CO","KS","MO","IA","NE","SD","ND"],
      "equipment_classes": ["Dry van","Flatbed","Reefer","Step deck"],
      "fleet_size_min": 1,
      "fleet_size_max": 30,
      "authority_age_min_years": 0,
      "hazmat_ok": true,
      "fuel_card_addon": false
    }'::jsonb,
    '{"no_passenger": true}'::jsonb,
    '{
      "advance_rate_pct": 90,
      "factoring_rate_pct": 2.9,
      "recourse": "recourse",
      "funding_speed": "Same-day",
      "monthly_minimum_usd": 20000,
      "fuel_card_addon": false,
      "fuel_card_description": null
    }'::jsonb,
    'TBS Factoring: flexible recourse factoring, no long-term contract, month-to-month terms. Perfect for newer authorities. $20K monthly minimum. Plains and Midwest coverage.'
  )
  ON CONFLICT (org_id) DO UPDATE SET
    criteria     = EXCLUDED.criteria,
    exclusions   = EXCLUDED.exclusions,
    terms        = EXCLUDED.terms,
    display_copy = EXCLUDED.display_copy,
    updated_at   = now();

  RAISE NOTICE 'Seeded factor_profiles for: apex-factoring (%), rts-financial (%), tbs-factoring (%)',
    v_apex_id, v_rts_id, v_tbs_id;
END $$;
