'use server';

import { pool } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export type SubmitQuoteResult = {
  ok: boolean;
  transfer_id?: string;
  error?: string;
};

/**
 * Submits a carrier's financing quote request.
 *
 * Writes 4 rows in a single transaction:
 *   1. lth.transfers (disposition='new')
 *   2. lth.message_threads (linked to the transfer)
 *   3. lth.messages (system message announcing the submission)
 *   4. lth.notifications (for the carrier user)
 *
 * Returns the new transfer_id on success.
 */
/**
 * Submit a financing quote request from a carrier to a factor.
 *
 * @param factorOrgId - UUID of the factor organization (from lth.factor_profiles.org_id)
 * @param carrierDot  - USDOT number string for the carrier (used to look up the carrier org)
 */
export async function submitQuote(
  factorOrgId: string,
  carrierDot: string,
): Promise<SubmitQuoteResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  // Look up the LtH user id for the signed-in auth user
  const userRow = await pool().query<{ id: string }>(
    'SELECT id FROM lth.users WHERE auth_user_id = $1',
    [user.id],
  );
  const lthUserId = userRow.rows[0]?.id;
  if (!lthUserId) return { ok: false, error: 'User profile not found.' };

  // Get factor org info for the system message
  const factorRow = await pool().query<{ name: string; slug: string }>(
    'SELECT name, slug FROM lth.organizations WHERE id = $1',
    [factorOrgId],
  );
  const factorOrg = factorRow.rows[0];
  if (!factorOrg) return { ok: false, error: 'Factor organization not found.' };

  // Get carrier org info for the contact_snapshot (look up by USDOT)
  const usdot = parseInt(carrierDot, 10);
  const carrierRow = await pool().query<{
    id: string;
    name: string;
    slug: string;
    usdot: number | null;
    legal_name: string | null;
  }>(
    'SELECT id, name, slug, usdot, legal_name FROM lth.organizations WHERE usdot = $1',
    [usdot],
  );
  const carrierOrg = carrierRow.rows[0];
  if (!carrierOrg) return { ok: false, error: 'Carrier organization not found.' };
  const carrierOrgId = carrierOrg.id;

  const client = await pool().connect();
  try {
    await client.query('BEGIN');

    // 1. Create the transfer
    const transferResult = await client.query<{ id: string }>(
      `INSERT INTO lth.transfers
         (partner_org_id, carrier_org_id, disposition, contact_snapshot, match_criteria)
       VALUES ($1, $2, 'new',
         $3::jsonb,
         $4::jsonb
       )
       RETURNING id`,
      [
        factorOrgId,
        carrierOrgId,
        JSON.stringify({
          name: carrierOrg.legal_name ?? carrierOrg.name,
          usdot: carrierOrg.usdot ?? 0,
          domicile: 'On file',
          equipment_class: 'On file',
          power_units: 0,
          drivers: 0,
          hazmat: false,
          authority_years: 0,
          phone: '',
          email: user.email ?? '',
        }),
        JSON.stringify(['Carrier submitted financing quote via Licensed to Haul']),
      ],
    );
    const transferId = transferResult.rows[0].id;

    // 2. Create the message thread
    const threadResult = await client.query<{ id: string }>(
      `INSERT INTO lth.message_threads (transfer_id) VALUES ($1) RETURNING id`,
      [transferId],
    );
    const threadId = threadResult.rows[0].id;

    // 3. System message announcing the submission
    const systemBody =
      `Your financing quote request has been submitted to ${factorOrg.name}. ` +
      `They will review your profile and reach out within 1–2 business days. ` +
      `You can track this conversation and send messages from your inbox.`;

    await client.query(
      `INSERT INTO lth.messages (thread_id, sender_user_id, sender_side, body)
       VALUES ($1, NULL, 'system', $2)`,
      [threadId, systemBody],
    );

    // 4. Notification for the carrier user
    await client.query(
      `INSERT INTO lth.notifications
         (recipient_user_id, category, subject, body, from_name, from_email,
          primary_action)
       VALUES ($1, 'financing', $2, $3, $4, 'financing@licensedtohaul.com',
         $5::jsonb
       )`,
      [
        lthUserId,
        `Quote submitted to ${factorOrg.name}`,
        systemBody,
        `Licensed to Haul × ${factorOrg.name}`,
        JSON.stringify({
          label: 'View conversation',
          href: `/dashboard/${carrierOrg.usdot}/conversations/${transferId}`,
        }),
      ],
    );

    await client.query('COMMIT');
    return { ok: true, transfer_id: transferId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('submitQuote failed:', err);
    return { ok: false, error: 'Failed to submit quote. Please try again.' };
  } finally {
    client.release();
  }
}
