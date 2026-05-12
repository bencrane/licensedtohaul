-- Dev seed: a couple of conversation threads for apex-factoring so the
-- master inbox isn't empty on first visit. Picks 3 transfers and seeds
-- 1-2 messages each (partner-sent — carrier-side replies arrive via
-- email inbound parse in Phase 5).
--
-- Apply with:
--   doppler --project hq-licensed-to-haul --config prd run \
--     --command='psql "$HQX_DB_URL_POOLED" -f migrations/seeds/003_dev_messages.sql'

DO $$
DECLARE
  v_partner_id  uuid;
  v_user_id     uuid;
  v_thread_id   uuid;
  v_transfer    record;
  v_count       int := 0;
BEGIN
  SELECT id INTO v_partner_id FROM lth.organizations WHERE slug = 'apex-factoring';
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'apex-factoring not found — run 001_dev_user.sql first';
  END IF;

  SELECT u.id INTO v_user_id
    FROM lth.users u
    JOIN auth.users au ON au.id = u.auth_user_id
   WHERE au.email = 'test@licensedtohaul.com'
   LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'test user not found — run 001_dev_user.sql first';
  END IF;

  -- Take 3 transfers in different dispositions so the inbox has variety.
  FOR v_transfer IN
    SELECT id, contact_snapshot, disposition
      FROM lth.transfers
     WHERE partner_org_id = v_partner_id
       AND disposition IN ('contacted','quoted','new')
     ORDER BY created_at DESC
     LIMIT 3
  LOOP
    INSERT INTO lth.message_threads (transfer_id)
    VALUES (v_transfer.id)
    ON CONFLICT (transfer_id) DO UPDATE SET transfer_id = EXCLUDED.transfer_id
    RETURNING id INTO v_thread_id;

    -- One partner-sent intro message.
    INSERT INTO lth.messages (thread_id, sender_user_id, sender_side, body, created_at)
    VALUES (
      v_thread_id,
      v_user_id,
      'partner',
      format(
        'Hi %s — Apex Factoring here. We work with carriers your size on freight invoice factoring. Same-day funding, no contracts, and our advance rate is competitive. Open to a 10-minute call this week?',
        split_part(v_transfer.contact_snapshot->>'name', ' ', 1)
      ),
      now() - interval '6 hours'
    );

    -- For 'quoted' and 'contacted', add a carrier-sent follow-up so unread counts populate.
    IF v_transfer.disposition IN ('quoted','contacted') THEN
      INSERT INTO lth.messages (thread_id, sender_user_id, sender_side, body, created_at)
      VALUES (
        v_thread_id,
        NULL,
        'carrier',
        'Appreciate the note. Send me your rate sheet and we can talk Tuesday afternoon CST.',
        now() - interval '2 hours'
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Seeded conversations for % transfers', v_count;
END $$;
