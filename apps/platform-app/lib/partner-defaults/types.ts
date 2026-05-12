import { z } from 'zod';

export const PartnerDefaultsSchema = z.object({
  excluded_states: z.array(z.string()).default([]),
  excluded_equipment: z.array(z.string()).default([]),
  fleet_size_min_floor: z.number().int().nonnegative().nullable().default(null),
  authority_years_min_floor: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .default(null),
  hazmat_default: z.enum(['either', 'required', 'excluded']).default('either'),
  preferred_fulfillment_days: z.union([
    z.literal(30),
    z.literal(45),
    z.literal(90),
  ]).default(45),
  notes: z.string().default(''),
});

export type PartnerDefaults = z.infer<typeof PartnerDefaultsSchema>;

export const EMPTY_DEFAULTS: PartnerDefaults = PartnerDefaultsSchema.parse({});

export type DefaultsFormState = {
  error: string | null;
  info: string | null;
};

export const initialDefaultsFormState: DefaultsFormState = {
  error: null,
  info: null,
};
