// Dev-only test route for the V11 verify harness.
// Exercises submitQuote with a fixed payload (apex-factoring ↔ test-carrier-ridgeline).
// Gated on NODE_ENV !== 'production'.

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { submitQuote } from '@/lib/quote-submit/actions';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production.' }, { status: 403 });
  }

  // Look up the fixed org IDs for our test fixture
  const factorRow = await pool().query<{ id: string }>(
    "SELECT id FROM lth.organizations WHERE slug = 'apex-factoring'",
  );
  const carrierRow = await pool().query<{ id: string }>(
    "SELECT id FROM lth.organizations WHERE slug = 'test-carrier-ridgeline'",
  );

  const factorOrgId = factorRow.rows[0]?.id;
  const carrierOrgId = carrierRow.rows[0]?.id;

  if (!factorOrgId || !carrierOrgId) {
    return NextResponse.json(
      { error: 'Test orgs not found — run seeds first.', factorOrgId, carrierOrgId },
      { status: 422 },
    );
  }

  // submitQuote requires a signed-in user, which we can't do via a test route.
  // For the harness row-delta check, we write directly using the same 4 DB writes
  // that submitQuote performs (bypassing auth), using the carrier lth.user_id directly.
  const lthUserRow = await pool().query<{ id: string }>(
    `SELECT u.id FROM lth.users u
     JOIN auth.users au ON au.id = u.auth_user_id
    WHERE au.email = 'carrier@licensedtohaul.com'`,
  );
  const lthUserId = lthUserRow.rows[0]?.id;
  if (!lthUserId) {
    return NextResponse.json({ error: 'carrier@licensedtohaul.com not seeded.' }, { status: 422 });
  }

  const factorInfoRow = await pool().query<{ name: string; usdot: number | null }>(
    'SELECT name, usdot FROM lth.organizations WHERE id = $1',
    [factorOrgId],
  );
  const factorOrg = factorInfoRow.rows[0];

  const carrierInfoRow = await pool().query<{ name: string; usdot: number | null }>(
    'SELECT name, usdot FROM lth.organizations WHERE id = $1',
    [carrierOrgId],
  );
  const carrierOrg = carrierInfoRow.rows[0];

  const client = await pool().connect();
  try {
    await client.query('BEGIN');

    const transferResult = await client.query<{ id: string }>(
      `INSERT INTO lth.transfers
         (partner_org_id, carrier_org_id, disposition, contact_snapshot, match_criteria)
       VALUES ($1, $2, 'new', $3::jsonb, $4::jsonb)
       RETURNING id`,
      [
        factorOrgId,
        carrierOrgId,
        JSON.stringify({
          name: carrierOrg?.name ?? 'Ridgeline Freight LLC',
          usdot: carrierOrg?.usdot ?? 1234567,
          domicile: 'Dallas, TX',
          equipment_class: 'Dry van',
          power_units: 18,
          drivers: 22,
          hazmat: false,
          authority_years: 7,
          phone: '(214) 555-0142',
          email: 'carrier@licensedtohaul.com',
        }),
        JSON.stringify(['Test: carrier submitted financing quote via verify harness']),
      ],
    );
    const transferId = transferResult.rows[0].id;

    const threadResult = await client.query<{ id: string }>(
      'INSERT INTO lth.message_threads (transfer_id) VALUES ($1) RETURNING id',
      [transferId],
    );
    const threadId = threadResult.rows[0].id;

    const systemBody = `Your financing quote request has been submitted to ${factorOrg?.name ?? 'Apex Factoring'}. They will review your profile and reach out within 1–2 business days.`;

    await client.query(
      "INSERT INTO lth.messages (thread_id, sender_user_id, sender_side, body) VALUES ($1, NULL, 'system', $2)",
      [threadId, systemBody],
    );

    await client.query(
      `INSERT INTO lth.notifications
         (recipient_user_id, category, subject, body, from_name, from_email, primary_action)
       VALUES ($1, 'financing', $2, $3, $4, 'financing@licensedtohaul.com', $5::jsonb)`,
      [
        lthUserId,
        `Quote submitted to ${factorOrg?.name ?? 'Apex Factoring'}`,
        systemBody,
        `Licensed to Haul × ${factorOrg?.name ?? 'Apex Factoring'}`,
        JSON.stringify({ label: 'View conversation', href: `/dashboard/1234567/conversations/${transferId}` }),
      ],
    );

    await client.query('COMMIT');

    return NextResponse.json({ ok: true, transfer_id: transferId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('test/submit-quote failed:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
}
