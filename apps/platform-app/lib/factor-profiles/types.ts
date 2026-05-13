// Types for lth.factor_profiles rows.

export type FactorCriteria = {
  states: string[];
  equipment_classes: string[];
  fleet_size_min: number;
  fleet_size_max: number;
  authority_age_min_years: number;
  hazmat_ok: boolean;
  fuel_card_addon: boolean;
};

export type FactorTerms = {
  advance_rate_pct: number;
  factoring_rate_pct: number;
  recourse: 'recourse' | 'non-recourse';
  funding_speed: string;
  monthly_minimum_usd: number | null;
  fuel_card_addon: boolean;
  fuel_card_description: string | null;
};

export type FactorProfile = {
  id: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  criteria: FactorCriteria;
  exclusions: Record<string, unknown>;
  terms: FactorTerms;
  display_copy: string | null;
  created_at: string;
  updated_at: string;
};
