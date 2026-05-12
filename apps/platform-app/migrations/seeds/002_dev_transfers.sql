-- Dev seed: carrier orgs + transfers attached to apex-factoring.
--
-- Apply with:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$HQX_DB_URL_POOLED" -f migrations/seeds/002_dev_transfers.sql'
--
-- Idempotency: errors on re-run if apex-factoring already has transfers.
-- To reset: DELETE FROM lth.transfers WHERE partner_org_id = (SELECT id FROM lth.organizations WHERE slug='apex-factoring');
-- (then DELETE the test-carrier-* orgs and re-run)

DO $$
DECLARE
  v_partner_id uuid;
  v_carrier_ids uuid[] := ARRAY[]::uuid[];
  v_carrier_id uuid;
  i int;
  -- Carrier data
  carrier_data jsonb := '[
    {"slug":"test-carrier-ridgeline","legal_name":"Ridgeline Freight LLC","usdot":1234567,"domicile":"Dallas, TX","equipment_class":"Dry van","power_units":18,"drivers":22,"authority_years":7,"hazmat":false,"phone":"(214) 555-0142","email":"dispatch@ridgelinefreight.com"},
    {"slug":"test-carrier-brookhaven","legal_name":"Brookhaven Transport Co","usdot":2345678,"domicile":"Atlanta, GA","equipment_class":"Reefer","power_units":34,"drivers":41,"authority_years":12,"hazmat":false,"phone":"(404) 555-0918","email":"ops@brookhaven-transport.com"},
    {"slug":"test-carrier-summit","legal_name":"Summit Haul & Logistics","usdot":3456789,"domicile":"Denver, CO","equipment_class":"Flatbed","power_units":9,"drivers":11,"authority_years":4,"hazmat":true,"phone":"(303) 555-0427","email":"dispatch@summithaul.com"},
    {"slug":"test-carrier-coastal","legal_name":"Coastal Run Trucking Inc","usdot":4567890,"domicile":"Jacksonville, FL","equipment_class":"Dry van","power_units":52,"drivers":63,"authority_years":15,"hazmat":false,"phone":"(904) 555-0331","email":"sara@coastalrun.com"},
    {"slug":"test-carrier-prairie","legal_name":"Prairie Wind Carriers","usdot":5678901,"domicile":"Omaha, NE","equipment_class":"Tanker","power_units":24,"drivers":28,"authority_years":9,"hazmat":true,"phone":"(402) 555-0716","email":"office@prairiewind.co"},
    {"slug":"test-carrier-redwood","legal_name":"Redwood Express LLC","usdot":6789012,"domicile":"Sacramento, CA","equipment_class":"Reefer","power_units":15,"drivers":18,"authority_years":6,"hazmat":false,"phone":"(916) 555-0288","email":"hello@redwoodexpress.com"}
  ]'::jsonb;
  -- Transfer dispositions to seed (and which carrier index to use for each)
  -- 8 transfers: 2 new, 2 contacted, 2 quoted, 1 won, 1 lost
  transfer_specs jsonb := '[
    {"carrier_idx":0, "disposition":"new",       "days_ago":0},
    {"carrier_idx":1, "disposition":"new",       "days_ago":1},
    {"carrier_idx":2, "disposition":"contacted", "days_ago":2},
    {"carrier_idx":3, "disposition":"contacted", "days_ago":3},
    {"carrier_idx":4, "disposition":"quoted",    "days_ago":5},
    {"carrier_idx":5, "disposition":"quoted",    "days_ago":4},
    {"carrier_idx":0, "disposition":"won",       "days_ago":8},
    {"carrier_idx":3, "disposition":"lost",      "days_ago":10}
  ]'::jsonb;
  spec jsonb;
  carrier_rec jsonb;
BEGIN
  -- 1. Find the partner org (must already exist from 001_dev_user.sql)
  SELECT id INTO v_partner_id FROM lth.organizations WHERE slug = 'apex-factoring';
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'apex-factoring org not found — run 001_dev_user.sql first';
  END IF;

  -- 2. Create carrier orgs (one per entry in carrier_data) with FMCSA snapshot.
  FOR carrier_rec IN SELECT * FROM jsonb_array_elements(carrier_data) LOOP
    v_carrier_id := gen_random_uuid();
    INSERT INTO lth.organizations (
      id, name, slug, category, usdot, authority_types,
      legal_name, claimed_at, fmcsa_snapshot, fmcsa_snapshot_at
    ) VALUES (
      v_carrier_id,
      carrier_rec->>'legal_name',
      carrier_rec->>'slug',
      'carrier',
      (carrier_rec->>'usdot')::bigint,
      ARRAY['carrier'],
      carrier_rec->>'legal_name',
      now(),
      jsonb_build_object(
        'equipment_class',  carrier_rec->>'equipment_class',
        'power_units',      (carrier_rec->>'power_units')::int,
        'drivers',          (carrier_rec->>'drivers')::int,
        'domicile',         carrier_rec->>'domicile',
        'authority_years',  (carrier_rec->>'authority_years')::int,
        'hazmat',           (carrier_rec->>'hazmat')::boolean
      ),
      now()
    );
    v_carrier_ids := array_append(v_carrier_ids, v_carrier_id);
  END LOOP;

  -- 3. Create transfers for the partner.
  i := 0;
  FOR spec IN SELECT * FROM jsonb_array_elements(transfer_specs) LOOP
    DECLARE
      idx int := (spec->>'carrier_idx')::int;
      disp text := spec->>'disposition';
      days_ago int := (spec->>'days_ago')::int;
      v_created timestamptz := now() - (days_ago || ' days')::interval;
    BEGIN
      INSERT INTO lth.transfers (
        partner_org_id, carrier_org_id, disposition,
        match_criteria, signals, contact_snapshot,
        created_at,
        contacted_at,
        quoted_at,
        closed_at
      )
      SELECT
        v_partner_id,
        v_carrier_ids[idx + 1],
        disp,
        jsonb_build_array(
          'In your domicile preference',
          'Equipment matches your spec',
          'Fleet size fits your range'
        ),
        jsonb_build_object(
          'authority_age_years', (carrier_data->idx->>'authority_years')::int,
          'csa_basic',           'satisfactory',
          'oos_rate',            '2.1%'
        ),
        jsonb_build_object(
          'name',           carrier_data->idx->>'legal_name',
          'usdot',          (carrier_data->idx->>'usdot')::bigint,
          'domicile',       carrier_data->idx->>'domicile',
          'equipment_class',carrier_data->idx->>'equipment_class',
          'power_units',    (carrier_data->idx->>'power_units')::int,
          'phone',          carrier_data->idx->>'phone',
          'email',          carrier_data->idx->>'email'
        ),
        v_created,
        CASE WHEN disp IN ('contacted','quoted','won','lost','rejected') THEN v_created + interval '4 hours' ELSE NULL END,
        CASE WHEN disp IN ('quoted','won','lost','rejected') THEN v_created + interval '1 day' ELSE NULL END,
        CASE WHEN disp IN ('won','lost','rejected') THEN v_created + interval '3 days' ELSE NULL END;
    END;
    i := i + 1;
  END LOOP;

  RAISE NOTICE 'Seeded % carrier orgs and % transfers for apex-factoring', array_length(v_carrier_ids, 1), i;
END $$;
