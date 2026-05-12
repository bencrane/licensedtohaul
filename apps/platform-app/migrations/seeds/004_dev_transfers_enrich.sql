-- Dev seed: enrich existing transfers' contact_snapshot with drivers/hazmat/authority_years,
-- and add more transfers to give the pipeline kanban actual density.

DO $$
DECLARE
  v_partner_id  uuid;
  v_carrier_ids uuid[] := ARRAY[]::uuid[];
  v_carrier_id  uuid;
  v_count       int := 0;
  -- More carriers to broaden the pipeline
  extra_carriers jsonb := '[
    {"slug":"test-carrier-blackrock","legal_name":"Blackrock Logistics","usdot":7890123,"domicile":"Houston, TX","equipment_class":"Flatbed","power_units":28,"drivers":34,"authority_years":11,"hazmat":false,"phone":"(713) 555-0421","email":"dispatch@blackrocklog.com"},
    {"slug":"test-carrier-westbound","legal_name":"Westbound Freight Inc","usdot":8901234,"domicile":"Phoenix, AZ","equipment_class":"Dry van","power_units":42,"drivers":50,"authority_years":18,"hazmat":false,"phone":"(602) 555-0339","email":"ops@westboundfreight.com"},
    {"slug":"test-carrier-allegheny","legal_name":"Allegheny Hauling LLC","usdot":9012345,"domicile":"Pittsburgh, PA","equipment_class":"Tanker","power_units":11,"drivers":13,"authority_years":5,"hazmat":true,"phone":"(412) 555-0612","email":"dispatch@alleghenyhauling.com"},
    {"slug":"test-carrier-greatlakes","legal_name":"Great Lakes Carriers Co","usdot":1029384,"domicile":"Milwaukee, WI","equipment_class":"Reefer","power_units":21,"drivers":25,"authority_years":8,"hazmat":false,"phone":"(414) 555-0177","email":"office@greatlakescarriers.com"},
    {"slug":"test-carrier-piedmont","legal_name":"Piedmont Truck Lines","usdot":1928374,"domicile":"Charlotte, NC","equipment_class":"Dry van","power_units":16,"drivers":19,"authority_years":4,"hazmat":false,"phone":"(704) 555-0908","email":"hello@piedmonttruck.com"},
    {"slug":"test-carrier-mojave","legal_name":"Mojave Express LLC","usdot":2837465,"domicile":"Las Vegas, NV","equipment_class":"Flatbed","power_units":13,"drivers":15,"authority_years":3,"hazmat":false,"phone":"(702) 555-0344","email":"dispatch@mojaveexpress.com"}
  ]'::jsonb;
  -- Additional transfers (carrier_idx is into extra_carriers array, 0-indexed)
  -- Mix of dispositions so columns fill out
  extra_transfers jsonb := '[
    {"carrier_idx":0, "disposition":"new",       "days_ago":0},
    {"carrier_idx":1, "disposition":"new",       "days_ago":1},
    {"carrier_idx":2, "disposition":"new",       "days_ago":2},
    {"carrier_idx":3, "disposition":"contacted", "days_ago":2},
    {"carrier_idx":4, "disposition":"contacted", "days_ago":3},
    {"carrier_idx":5, "disposition":"contacted", "days_ago":4},
    {"carrier_idx":0, "disposition":"quoted",    "days_ago":5},
    {"carrier_idx":2, "disposition":"quoted",    "days_ago":6},
    {"carrier_idx":1, "disposition":"won",       "days_ago":9},
    {"carrier_idx":4, "disposition":"won",       "days_ago":12},
    {"carrier_idx":3, "disposition":"lost",      "days_ago":11},
    {"carrier_idx":5, "disposition":"lost",      "days_ago":14}
  ]'::jsonb;
  spec  jsonb;
  carrier_rec jsonb;
BEGIN
  SELECT id INTO v_partner_id FROM lth.organizations WHERE slug = 'apex-factoring';
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'apex-factoring not found';
  END IF;

  -- 1. Enrich existing transfer.contact_snapshot from their carrier_org's fmcsa_snapshot.
  UPDATE lth.transfers t
     SET contact_snapshot = t.contact_snapshot || jsonb_build_object(
           'drivers',         (o.fmcsa_snapshot->>'drivers')::int,
           'hazmat',          (o.fmcsa_snapshot->>'hazmat')::boolean,
           'authority_years', (o.fmcsa_snapshot->>'authority_years')::int
         )
    FROM lth.organizations o
   WHERE t.carrier_org_id = o.id
     AND t.partner_org_id = v_partner_id
     AND NOT (t.contact_snapshot ? 'drivers');

  -- 2. Create the extra carrier orgs (skip if slug already exists).
  FOR carrier_rec IN SELECT * FROM jsonb_array_elements(extra_carriers) LOOP
    SELECT id INTO v_carrier_id FROM lth.organizations WHERE slug = carrier_rec->>'slug';
    IF v_carrier_id IS NULL THEN
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
    END IF;
    v_carrier_ids := array_append(v_carrier_ids, v_carrier_id);
  END LOOP;

  -- 3. Create the extra transfers.
  FOR spec IN SELECT * FROM jsonb_array_elements(extra_transfers) LOOP
    DECLARE
      idx      int := (spec->>'carrier_idx')::int;
      disp     text := spec->>'disposition';
      days_ago int := (spec->>'days_ago')::int;
      v_created timestamptz := now() - (days_ago || ' days')::interval;
    BEGIN
      INSERT INTO lth.transfers (
        partner_org_id, carrier_org_id, disposition,
        match_criteria, signals, contact_snapshot,
        created_at, contacted_at, quoted_at, closed_at
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
          'authority_age_years', (extra_carriers->idx->>'authority_years')::int,
          'csa_basic',           'satisfactory',
          'oos_rate',            '2.1%'
        ),
        jsonb_build_object(
          'name',            extra_carriers->idx->>'legal_name',
          'usdot',           (extra_carriers->idx->>'usdot')::bigint,
          'domicile',        extra_carriers->idx->>'domicile',
          'equipment_class', extra_carriers->idx->>'equipment_class',
          'power_units',     (extra_carriers->idx->>'power_units')::int,
          'drivers',         (extra_carriers->idx->>'drivers')::int,
          'hazmat',          (extra_carriers->idx->>'hazmat')::boolean,
          'authority_years', (extra_carriers->idx->>'authority_years')::int,
          'phone',           extra_carriers->idx->>'phone',
          'email',           extra_carriers->idx->>'email'
        ),
        v_created,
        CASE WHEN disp IN ('contacted','quoted','won','lost','rejected') THEN v_created + interval '4 hours' ELSE NULL END,
        CASE WHEN disp IN ('quoted','won','lost','rejected') THEN v_created + interval '1 day' ELSE NULL END,
        CASE WHEN disp IN ('won','lost','rejected') THEN v_created + interval '3 days' ELSE NULL END;
      v_count := v_count + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Enriched existing transfers and added % new transfers for apex-factoring', v_count;
END $$;
