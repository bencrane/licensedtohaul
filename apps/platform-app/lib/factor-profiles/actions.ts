'use server';

import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/db';
import type { FactorProfile } from './types';

type DBFactorProfile = {
  id: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  criteria: FactorProfile['criteria'];
  exclusions: Record<string, unknown>;
  terms: FactorProfile['terms'];
  display_copy: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Returns all factor profiles joined to their org, for carrier-side financing page.
 * Only returns orgs with category='factoring' that have a profile row.
 */
export async function listFactorProfiles(): Promise<FactorProfile[]> {
  const { rows } = await pool().query<DBFactorProfile>(
    `SELECT fp.id, fp.org_id, o.name AS org_name, o.slug AS org_slug,
            fp.criteria, fp.exclusions, fp.terms, fp.display_copy,
            fp.created_at, fp.updated_at
       FROM lth.factor_profiles fp
       JOIN lth.organizations o ON o.id = fp.org_id
      WHERE o.category = 'factoring'
      ORDER BY o.name ASC`,
  );
  return rows;
}

/**
 * Returns the factor profile for a given org slug. Used on the partner profile page.
 */
export async function getFactorProfileBySlug(slug: string): Promise<FactorProfile | null> {
  const { rows } = await pool().query<DBFactorProfile>(
    `SELECT fp.id, fp.org_id, o.name AS org_name, o.slug AS org_slug,
            fp.criteria, fp.exclusions, fp.terms, fp.display_copy,
            fp.created_at, fp.updated_at
       FROM lth.factor_profiles fp
       JOIN lth.organizations o ON o.id = fp.org_id
      WHERE o.slug = $1`,
    [slug],
  );
  return rows[0] ?? null;
}

/**
 * Upserts the factor profile for the signed-in partner's org.
 */
export async function saveFactorProfile(
  slug: string,
  data: {
    criteria: FactorProfile['criteria'];
    exclusions: Record<string, unknown>;
    terms: FactorProfile['terms'];
    display_copy: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const orgRow = await pool().query<{ id: string }>(
    'SELECT id FROM lth.organizations WHERE slug = $1',
    [slug],
  );
  const orgId = orgRow.rows[0]?.id;
  if (!orgId) return { ok: false, error: 'Organization not found.' };

  await pool().query(
    `INSERT INTO lth.factor_profiles (org_id, criteria, exclusions, terms, display_copy)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (org_id) DO UPDATE SET
       criteria     = EXCLUDED.criteria,
       exclusions   = EXCLUDED.exclusions,
       terms        = EXCLUDED.terms,
       display_copy = EXCLUDED.display_copy,
       updated_at   = now()`,
    [
      orgId,
      JSON.stringify(data.criteria),
      JSON.stringify(data.exclusions),
      JSON.stringify(data.terms),
      data.display_copy,
    ],
  );

  revalidatePath(`/partner/${slug}/profile`);
  return { ok: true };
}
