'use server';

import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/audience-specs/db';
import {
  EMPTY_DEFAULTS,
  PartnerDefaultsSchema,
  initialDefaultsFormState,
  type DefaultsFormState,
  type PartnerDefaults,
} from './types';

export async function loadDefaultsForOrg(slug: string): Promise<PartnerDefaults> {
  const { rows } = await pool().query<{ partner_defaults: unknown }>(
    'SELECT partner_defaults FROM lth.organizations WHERE slug = $1',
    [slug],
  );
  const raw = rows[0]?.partner_defaults;
  if (!raw || (typeof raw === 'object' && Object.keys(raw).length === 0)) {
    return EMPTY_DEFAULTS;
  }
  const parsed = PartnerDefaultsSchema.safeParse(raw);
  return parsed.success ? parsed.data : EMPTY_DEFAULTS;
}

function readStringList(formData: FormData, name: string): string[] {
  const all = formData.getAll(name).map((v) => String(v));
  if (all.length === 0) return [];
  if (all.length === 1) {
    return all[0]
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return all.map((s) => s.trim()).filter(Boolean);
}

function parseOptionalInt(v: FormDataEntryValue | null): number | null {
  if (!v || String(v).trim() === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

export async function saveDefaults(
  slug: string,
  _prev: DefaultsFormState,
  formData: FormData,
): Promise<DefaultsFormState> {
  let payload: PartnerDefaults;
  try {
    payload = PartnerDefaultsSchema.parse({
      excluded_states: readStringList(formData, 'excluded_states'),
      excluded_equipment: readStringList(formData, 'excluded_equipment'),
      fleet_size_min_floor: parseOptionalInt(formData.get('fleet_size_min_floor')),
      authority_years_min_floor: parseOptionalInt(
        formData.get('authority_years_min_floor'),
      ),
      hazmat_default: formData.get('hazmat_default') ?? 'either',
      preferred_fulfillment_days: Number(
        formData.get('preferred_fulfillment_days') ?? 45,
      ),
      notes: String(formData.get('notes') ?? '').trim(),
    });
  } catch (err) {
    return { ...initialDefaultsFormState, error: (err as Error).message };
  }

  const { rowCount } = await pool().query(
    `UPDATE lth.organizations
        SET partner_defaults = $1::jsonb
      WHERE slug = $2`,
    [JSON.stringify(payload), slug],
  );
  if (rowCount === 0) {
    return {
      ...initialDefaultsFormState,
      error: `No organization with slug "${slug}".`,
    };
  }

  revalidatePath(`/partner/${slug}/defaults`);
  revalidatePath(`/partner/${slug}/compose`);
  revalidatePath(`/partner/${slug}/catalog`);
  return { error: null, info: 'Defaults saved.' };
}
