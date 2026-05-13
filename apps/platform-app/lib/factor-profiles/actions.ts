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

type CarrierFmcsa = {
  domicile: string | null;
  equipment_class: string | null;
  power_units: number | null;
  authority_years: number | null;
  hazmat: boolean | null;
};

function parseStateFromDomicile(domicile: string | null): string | null {
  if (!domicile) return null;
  const m = domicile.match(/,\s*([A-Z]{2})\s*$/);
  return m ? m[1] : null;
}

/**
 * Returns factor profiles that match a carrier's FMCSA profile, plus reason strings
 * for each match. Filtering rules (any criterion that fails → carrier doesn't see this factor):
 *
 * - state: carrier domicile-state must be in factor.states (empty list = factor serves all states)
 * - equipment: carrier.equipment_class must be in factor.equipment_classes (empty = all)
 * - fleet size: factor.fleet_size_min ≤ carrier.power_units ≤ factor.fleet_size_max
 * - authority age: carrier.authority_years ≥ factor.authority_age_min_years
 * - hazmat: if carrier.hazmat = true, factor.hazmat_ok must also be true
 */
export async function listFactorProfilesForCarrierDot(
  dot: string,
): Promise<Array<FactorProfile & { match_reasons: string[] }>> {
  const carrierRow = await pool().query<{ fmcsa_snapshot: CarrierFmcsa | null }>(
    `SELECT fmcsa_snapshot FROM lth.organizations WHERE usdot::text = $1 AND category = 'carrier'`,
    [dot],
  );
  const fm = carrierRow.rows[0]?.fmcsa_snapshot ?? null;
  if (!fm) return [];

  const carrierState = parseStateFromDomicile(fm.domicile);
  const carrierEquipment = fm.equipment_class ?? null;
  const carrierPower = fm.power_units ?? null;
  const carrierAuthority = fm.authority_years ?? null;
  const carrierHazmat = fm.hazmat ?? false;

  const all = await listFactorProfiles();

  return all.flatMap((p) => {
    const c = p.criteria;
    const reasons: string[] = [];

    if (c.states && c.states.length > 0) {
      if (!carrierState || !c.states.includes(carrierState)) return [];
      reasons.push(`Factors carriers in ${carrierState}`);
    } else {
      reasons.push("Factors carriers in any state");
    }

    if (c.equipment_classes && c.equipment_classes.length > 0) {
      if (!carrierEquipment || !c.equipment_classes.includes(carrierEquipment)) return [];
      reasons.push(`Covers ${carrierEquipment.toLowerCase()} equipment`);
    }

    if (carrierPower != null) {
      if (carrierPower < c.fleet_size_min || carrierPower > c.fleet_size_max) return [];
      reasons.push(`Fleet size ${c.fleet_size_min}-${c.fleet_size_max} PU (you: ${carrierPower})`);
    }

    if (carrierAuthority != null && c.authority_age_min_years > 0) {
      if (carrierAuthority < c.authority_age_min_years) return [];
      reasons.push(`Min ${c.authority_age_min_years}y authority (you: ${carrierAuthority}y)`);
    }

    if (carrierHazmat && !c.hazmat_ok) return [];
    if (carrierHazmat) reasons.push("Accepts hazmat-endorsed carriers");

    return [{ ...p, match_reasons: reasons }];
  });
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
