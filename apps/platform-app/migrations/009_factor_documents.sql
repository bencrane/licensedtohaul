-- Factor documents (NOA, master agreements, addenda) sent via Documenso.
CREATE TABLE IF NOT EXISTS factor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_slug text NOT NULL,
  carrier_dot text NOT NULL,
  document_kind text NOT NULL,
  state text NOT NULL DEFAULT 'sent',
  documenso_document_id text NOT NULL,
  documenso_template_id text,
  carrier_signing_token text,
  factor_signing_token text,
  carrier_signed_at timestamptz,
  factor_signed_at timestamptz,
  completed_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  notes text,
  payload jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_factor_documents_carrier ON factor_documents (carrier_dot, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_factor_documents_factor ON factor_documents (factor_slug, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_factor_documents_doc_id ON factor_documents (documenso_document_id);
CREATE INDEX IF NOT EXISTS idx_factor_documents_pending_carrier
  ON factor_documents (carrier_dot, state)
  WHERE state IN ('sent', 'opened', 'signed_by_carrier');

CREATE TABLE IF NOT EXISTS factor_partner_config (
  factor_slug text PRIMARY KEY,
  documenso_noa_template_id text,
  documenso_master_agreement_template_id text,
  documenso_addendum_template_id text,
  documenso_side_letter_template_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factor_document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES factor_documents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor text,
  payload jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_factor_document_events_doc ON factor_document_events (document_id, occurred_at);
