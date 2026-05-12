'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { pool } from './db';
import {
  CriteriaSchema,
  ExclusionsSchema,
  type Criteria,
} from './types';

type ComposePayload = {
  name: string;
  criteria: Criteria;
  monthly_transfer_target: number;
  price_per_transfer_cents: number;
};

/**
 * Lock-in path for the composer. Takes a structured payload (not FormData),
 * writes a draft spec, returns the new spec id so the client can navigate.
 *
 * The composer expresses budget as monthly volume × price. We store
 *   budget_cap_cents = monthly_target × price_per_transfer_cents
 * for compatibility with the existing schema.
 */
export async function composeAndLockSpec(
  slug: string,
  payload: ComposePayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { rows } = await pool().query<{ id: string }>(
    'SELECT id FROM lth.organizations WHERE slug = $1',
    [slug],
  );
  const orgId = rows[0]?.id;
  if (!orgId) {
    return { ok: false, error: `No organization with slug "${slug}".` };
  }
  if (!payload.name?.trim()) {
    return { ok: false, error: 'Name is required.' };
  }

  // Validate the criteria JSONB matches our schema.
  let criteria: Criteria;
  try {
    criteria = CriteriaSchema.parse(payload.criteria);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const exclusions = ExclusionsSchema.parse({});

  const budgetCapCents =
    payload.monthly_transfer_target * payload.price_per_transfer_cents;

  const result = await pool().query<{ id: string }>(
    `INSERT INTO lth.audience_specs
       (partner_org_id, name, criteria, exclusions,
        budget_cap_cents, price_per_transfer_cents, status)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, 'active')
     RETURNING id`,
    [
      orgId,
      payload.name.trim(),
      JSON.stringify(criteria),
      JSON.stringify(exclusions),
      budgetCapCents,
      payload.price_per_transfer_cents,
    ],
  );

  revalidatePath(`/partner/${slug}/spec`);
  return { ok: true, id: result.rows[0].id };
}

export async function composeAndLockThenRedirect(
  slug: string,
  payload: ComposePayload,
): Promise<void> {
  const result = await composeAndLockSpec(slug, payload);
  if (result.ok) {
    redirect(`/partner/${slug}/spec/${result.id}`);
  }
  throw new Error(result.error);
}
