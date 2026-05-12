'use server';

import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/audience-specs/db';
import type { TransferDisposition, TransferRow } from './types';

const VALID_DISPOSITIONS: TransferDisposition[] = [
  'new',
  'contacted',
  'quoted',
  'won',
  'lost',
  'rejected',
];

async function getOrgIdBySlug(slug: string): Promise<string | null> {
  const { rows } = await pool().query<{ id: string }>(
    'SELECT id FROM lth.organizations WHERE slug = $1',
    [slug],
  );
  return rows[0]?.id ?? null;
}

export async function getTransferById(transferId: string): Promise<TransferRow | null> {
  const { rows } = await pool().query<TransferRow>(
    `SELECT id, partner_org_id, carrier_org_id, disposition,
            match_criteria, signals, contact_snapshot,
            created_at, contacted_at, quoted_at, closed_at
       FROM lth.transfers
      WHERE id = $1`,
    [transferId],
  );
  return rows[0] ?? null;
}

export async function listTransfersForOrg(slug: string): Promise<TransferRow[]> {
  const orgId = await getOrgIdBySlug(slug);
  if (!orgId) return [];
  const { rows } = await pool().query<TransferRow>(
    `SELECT id, partner_org_id, carrier_org_id, disposition,
            match_criteria, signals, contact_snapshot,
            created_at, contacted_at, quoted_at, closed_at
       FROM lth.transfers
      WHERE partner_org_id = $1
      ORDER BY created_at DESC`,
    [orgId],
  );
  return rows;
}

/**
 * Void-returning variant for direct `<form action={...}>` usage. Throws on
 * invalid disposition (server-side error visible in logs); the page revalidates
 * so the user sees the current truth either way.
 */
export async function setTransferDisposition(
  slug: string,
  transferId: string,
  newDisposition: TransferDisposition,
): Promise<void> {
  const result = await updateTransferDisposition(slug, transferId, newDisposition);
  if (!result.ok) throw new Error(result.error ?? 'Failed to set disposition');
}

export async function updateTransferDisposition(
  slug: string,
  transferId: string,
  newDisposition: TransferDisposition,
): Promise<{ ok: boolean; error?: string }> {
  if (!VALID_DISPOSITIONS.includes(newDisposition)) {
    return { ok: false, error: `Invalid disposition: ${newDisposition}` };
  }

  // Stamp the matching timestamp column when transitioning into a state.
  // Only sets the column if it's currently NULL (first-touch semantics).
  await pool().query(
    `UPDATE lth.transfers
        SET disposition = $1,
            contacted_at = CASE
              WHEN $1 IN ('contacted','quoted','won','lost','rejected') AND contacted_at IS NULL THEN now()
              ELSE contacted_at
            END,
            quoted_at = CASE
              WHEN $1 IN ('quoted','won','lost','rejected') AND quoted_at IS NULL THEN now()
              ELSE quoted_at
            END,
            closed_at = CASE
              WHEN $1 IN ('won','lost','rejected') AND closed_at IS NULL THEN now()
              ELSE closed_at
            END
      WHERE id = $2`,
    [newDisposition, transferId],
  );

  revalidatePath(`/partner/${slug}/pipeline`);
  revalidatePath(`/partner/${slug}/transfers`);
  return { ok: true };
}
