-- Migration 008: Quote submissions + stage history
-- Part of: on-platform deal room (Documenso end-to-end)

CREATE TABLE IF NOT EXISTS quote_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_dot text NOT NULL,
  factor_slug text NOT NULL,
  quote_id text NOT NULL,
  stage text NOT NULL DEFAULT 'submitted',
    -- submitted | underwriting | approved | declined | noa_sent | noa_signed | active | offboarded
  rate text NOT NULL,
  recourse_label text NOT NULL,
  funding_speed text NOT NULL,
  monthly_minimum text,
  notes text,
  fields_shared text[] NOT NULL DEFAULT ARRAY[]::text[],
  noa_envelope_id uuid REFERENCES noa_envelopes(id) ON DELETE SET NULL,
  factor_of_record_id uuid REFERENCES factor_of_record(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_dot, factor_slug)
);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_carrier ON quote_submissions (carrier_dot, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_factor_open ON quote_submissions (factor_slug, stage) WHERE stage NOT IN ('declined', 'offboarded');

-- Stage history (audit) — separate table so we keep ordered transitions
CREATE TABLE IF NOT EXISTS quote_submission_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES quote_submissions(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  actor text NOT NULL,  -- 'carrier' | 'factor' | 'system'
  note text,
  transitioned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qss_history_submission ON quote_submission_stage_history (submission_id, transitioned_at);
