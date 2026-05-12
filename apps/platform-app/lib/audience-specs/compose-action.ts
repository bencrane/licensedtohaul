'use server';

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
  transfer_count_target: number;
  fulfillment_window_days: number;
  price_per_transfer_cents: number;
};

/**
 * Lock-in path for the composer. Writes the agreed deal as an active spec:
 *   - criteria + exclusions JSONB
 *   - transfer_count_target (how many we owe)
 *   - fulfillment_window_days (how long to deliver)
 *   - price_per_transfer_cents (the indexed rate, set by the platform)
 *   - budget_cap_cents derived: target × price
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

  let criteria: Criteria;
  try {
    criteria = CriteriaSchema.parse(payload.criteria);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const exclusions = ExclusionsSchema.parse({});

  const budgetCapCents =
    payload.transfer_count_target * payload.price_per_transfer_cents;

  const result = await pool().query<{ id: string }>(
    `INSERT INTO lth.audience_specs
       (partner_org_id, name, criteria, exclusions,
        transfer_count_target, fulfillment_window_days,
        price_per_transfer_cents, budget_cap_cents, status)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, 'active')
     RETURNING id`,
    [
      orgId,
      payload.name.trim(),
      JSON.stringify(criteria),
      JSON.stringify(exclusions),
      payload.transfer_count_target,
      payload.fulfillment_window_days,
      payload.price_per_transfer_cents,
      budgetCapCents,
    ],
  );

  revalidatePath(`/partner/${slug}/spec`);
  return { ok: true, id: result.rows[0].id };
}
