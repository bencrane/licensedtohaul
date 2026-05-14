// Types for quote_submissions + quote_submission_stage_history tables.
// All exported types are camelCase; internal rowToSubmission mappers handle snake_case DB rows.

export type QuoteSubmissionStage =
  | 'submitted'
  | 'underwriting'
  | 'approved'
  | 'declined'
  | 'noa_sent'
  | 'noa_signed'
  | 'active'
  | 'disbursing'
  | 'offboarded';

/** Allowed stage transitions: fromStage -> set of valid toStages */
export const ALLOWED_TRANSITIONS: Record<QuoteSubmissionStage, QuoteSubmissionStage[]> = {
  submitted: ['underwriting', 'declined'],
  underwriting: ['approved', 'declined'],
  approved: ['noa_sent', 'declined'],
  declined: [],
  noa_sent: ['noa_signed', 'declined'],
  noa_signed: ['active'],
  active: ['disbursing', 'offboarded'],
  disbursing: ['offboarded'],
  offboarded: [],
};

export interface QuoteSubmission {
  id: string;
  carrierDot: string;
  factorSlug: string;
  quoteId: string;
  stage: QuoteSubmissionStage;
  rate: string;
  recourseLabel: string;
  fundingSpeed: string;
  monthlyMinimum: string | null;
  notes: string | null;
  fieldsShared: string[];
  noaEnvelopeId: string | null;
  factorOfRecordId: string | null;
  submittedAt: Date;
  updatedAt: Date;
}

export interface StageHistoryRow {
  id: string;
  submissionId: string;
  fromStage: QuoteSubmissionStage | null;
  toStage: QuoteSubmissionStage;
  actor: string;
  note: string | null;
  transitionedAt: Date;
}

// Snake_case DB row shape — internal only
export interface _QuoteSubmissionPgRow {
  id: string;
  carrier_dot: string;
  factor_slug: string;
  quote_id: string;
  stage: string;
  rate: string;
  recourse_label: string;
  funding_speed: string;
  monthly_minimum: string | null;
  notes: string | null;
  fields_shared: string[];
  noa_envelope_id: string | null;
  factor_of_record_id: string | null;
  submitted_at: Date;
  updated_at: Date;
}

export function rowToSubmission(row: _QuoteSubmissionPgRow): QuoteSubmission {
  return {
    id: row.id,
    carrierDot: row.carrier_dot,
    factorSlug: row.factor_slug,
    quoteId: row.quote_id,
    stage: row.stage as QuoteSubmissionStage,
    rate: row.rate,
    recourseLabel: row.recourse_label,
    fundingSpeed: row.funding_speed,
    monthlyMinimum: row.monthly_minimum ?? null,
    notes: row.notes ?? null,
    fieldsShared: row.fields_shared ?? [],
    noaEnvelopeId: row.noa_envelope_id ?? null,
    factorOfRecordId: row.factor_of_record_id ?? null,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}
