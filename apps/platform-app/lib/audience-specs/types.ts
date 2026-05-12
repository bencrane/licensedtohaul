import { z } from 'zod';

export const SafetyRatingSchema = z.enum([
  'satisfactory',
  'conditional',
  'unsatisfactory',
  'none',
]);
export type SafetyRating = z.infer<typeof SafetyRatingSchema>;

export const CriteriaSchema = z.object({
  domicile_states: z.array(z.string()).default([]),
  equipment_classes: z.array(z.string()).default([]),
  fleet_size_min: z.number().int().nonnegative().nullable().default(null),
  fleet_size_max: z.number().int().nonnegative().nullable().default(null),
  authority_age_years_min: z.number().int().nonnegative().nullable().default(null),
  hazmat: z.enum(['required', 'excluded', 'either']).default('either'),
  safety_ratings: z.array(SafetyRatingSchema).default([]),
  notes: z.string().default(''),
});
export type Criteria = z.infer<typeof CriteriaSchema>;

export const ExclusionsSchema = z.object({
  excluded_usdots: z.array(z.string()).default([]),
  excluded_states: z.array(z.string()).default([]),
  min_insurance_liability_usd: z.number().int().nonnegative().nullable().default(null),
  out_of_service_excluded: z.boolean().default(true),
  notes: z.string().default(''),
});
export type Exclusions = z.infer<typeof ExclusionsSchema>;

export const StatusSchema = z.enum(['draft', 'active', 'paused', 'archived']);
export type Status = z.infer<typeof StatusSchema>;

export type AudienceSpec = {
  id: string;
  partner_org_id: string;
  name: string;
  criteria: Criteria;
  exclusions: Exclusions;
  budget_cap_cents: number | null;
  price_per_transfer_cents: number | null;
  status: Status;
  created_at: string;
  updated_at: string;
};

export type SpecFormState = {
  error: string | null;
  info: string | null;
};

export const initialFormState: SpecFormState = { error: null, info: null };
