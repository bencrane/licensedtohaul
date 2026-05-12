'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { pool } from './db';
import {
  CriteriaSchema,
  ExclusionsSchema,
  StatusSchema,
  initialFormState,
  type AudienceSpec,
  type SpecFormState,
  type Status,
} from './types';

// ---------- form parsing helpers ----------

function parseStringList(v: FormDataEntryValue | null): string[] {
  if (!v) return [];
  return String(v)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Use this for fields that may be either a single textarea (CSV/newline) or
// repeating checkbox inputs.
function readStringList(formData: FormData, name: string): string[] {
  const all = formData.getAll(name).map((v) => String(v));
  if (all.length === 0) return [];
  if (all.length === 1) return parseStringList(all[0]);
  return all.map((s) => s.trim()).filter(Boolean);
}

function parseOptionalInt(v: FormDataEntryValue | null): number | null {
  if (!v || String(v).trim() === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function parseBoolean(v: FormDataEntryValue | null): boolean {
  return v === 'on' || v === 'true';
}

function parseDollarsToCents(v: FormDataEntryValue | null): number | null {
  if (!v || String(v).trim() === '') return null;
  const n = Number(String(v));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

// ---------- queries ----------

async function getOrgIdBySlug(slug: string): Promise<string | null> {
  const { rows } = await pool().query<{ id: string }>(
    'SELECT id FROM lth.organizations WHERE slug = $1',
    [slug],
  );
  return rows[0]?.id ?? null;
}

export async function listSpecsForOrg(slug: string): Promise<AudienceSpec[]> {
  const orgId = await getOrgIdBySlug(slug);
  if (!orgId) return [];
  const { rows } = await pool().query<AudienceSpec>(
    `SELECT id, partner_org_id, name, criteria, exclusions,
            budget_cap_cents, price_per_transfer_cents, status,
            created_at, updated_at
       FROM lth.audience_specs
      WHERE partner_org_id = $1 AND status != 'archived'
      ORDER BY updated_at DESC`,
    [orgId],
  );
  return rows;
}

export async function getSpec(specId: string): Promise<AudienceSpec | null> {
  const { rows } = await pool().query<AudienceSpec>(
    `SELECT id, partner_org_id, name, criteria, exclusions,
            budget_cap_cents, price_per_transfer_cents, status,
            created_at, updated_at
       FROM lth.audience_specs
      WHERE id = $1`,
    [specId],
  );
  return rows[0] ?? null;
}

// ---------- mutations ----------

function readFormPayload(formData: FormData) {
  const criteria = CriteriaSchema.parse({
    domicile_states: readStringList(formData, 'domicile_states'),
    equipment_classes: readStringList(formData, 'equipment_classes'),
    fleet_size_min: parseOptionalInt(formData.get('fleet_size_min')),
    fleet_size_max: parseOptionalInt(formData.get('fleet_size_max')),
    authority_age_years_min: parseOptionalInt(formData.get('authority_age_years_min')),
    hazmat: (formData.get('hazmat') as string) ?? 'either',
    safety_ratings: readStringList(formData, 'safety_ratings'),
    notes: String(formData.get('criteria_notes') ?? '').trim(),
  });

  const exclusions = ExclusionsSchema.parse({
    excluded_usdots: readStringList(formData, 'excluded_usdots'),
    excluded_states: readStringList(formData, 'excluded_states'),
    min_insurance_liability_usd: parseOptionalInt(
      formData.get('min_insurance_liability_usd'),
    ),
    out_of_service_excluded: parseBoolean(formData.get('out_of_service_excluded')),
    notes: String(formData.get('exclusions_notes') ?? '').trim(),
  });

  const status = StatusSchema.parse(
    (formData.get('status') as string) || 'draft',
  );

  return {
    name: String(formData.get('name') ?? '').trim(),
    criteria,
    exclusions,
    budget_cap_cents: parseDollarsToCents(formData.get('budget_cap_dollars')),
    price_per_transfer_cents: parseDollarsToCents(
      formData.get('price_per_transfer_dollars'),
    ),
    status,
  };
}

export async function createSpec(
  slug: string,
  _prev: SpecFormState,
  formData: FormData,
): Promise<SpecFormState> {
  const orgId = await getOrgIdBySlug(slug);
  if (!orgId) {
    return {
      ...initialFormState,
      error: `No organization with slug "${slug}". Create one in lth.organizations first.`,
    };
  }

  let payload;
  try {
    payload = readFormPayload(formData);
  } catch (err) {
    return { ...initialFormState, error: (err as Error).message };
  }

  if (!payload.name) {
    return { ...initialFormState, error: 'Name is required.' };
  }

  const { rows } = await pool().query<{ id: string }>(
    `INSERT INTO lth.audience_specs
       (partner_org_id, name, criteria, exclusions,
        budget_cap_cents, price_per_transfer_cents, status)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)
     RETURNING id`,
    [
      orgId,
      payload.name,
      JSON.stringify(payload.criteria),
      JSON.stringify(payload.exclusions),
      payload.budget_cap_cents,
      payload.price_per_transfer_cents,
      payload.status,
    ],
  );

  revalidatePath(`/partner/${slug}/spec`);
  redirect(`/partner/${slug}/spec/${rows[0].id}`);
}

export async function updateSpec(
  slug: string,
  specId: string,
  _prev: SpecFormState,
  formData: FormData,
): Promise<SpecFormState> {
  let payload;
  try {
    payload = readFormPayload(formData);
  } catch (err) {
    return { ...initialFormState, error: (err as Error).message };
  }
  if (!payload.name) {
    return { ...initialFormState, error: 'Name is required.' };
  }

  await pool().query(
    `UPDATE lth.audience_specs
        SET name = $1,
            criteria = $2::jsonb,
            exclusions = $3::jsonb,
            budget_cap_cents = $4,
            price_per_transfer_cents = $5,
            status = $6
      WHERE id = $7`,
    [
      payload.name,
      JSON.stringify(payload.criteria),
      JSON.stringify(payload.exclusions),
      payload.budget_cap_cents,
      payload.price_per_transfer_cents,
      payload.status,
      specId,
    ],
  );

  revalidatePath(`/partner/${slug}/spec`);
  revalidatePath(`/partner/${slug}/spec/${specId}`);
  return { error: null, info: 'Saved.' };
}

export async function archiveSpec(slug: string, specId: string): Promise<void> {
  await pool().query(
    `UPDATE lth.audience_specs SET status = 'archived' WHERE id = $1`,
    [specId],
  );
  revalidatePath(`/partner/${slug}/spec`);
  redirect(`/partner/${slug}/spec`);
}

