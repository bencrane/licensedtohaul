export type DocumentKind =
  | 'noa'
  | 'master_agreement'
  | 'addendum'
  | 'side_letter'
  | 'other';

export type DocumentState =
  | 'draft'
  | 'sent'
  | 'opened'
  | 'signed_by_carrier'
  | 'signed_by_factor'
  | 'completed'
  | 'rejected'
  | 'voided'
  | 'expired';

export interface FactorDocumentRow {
  id: string;
  factor_slug: string;
  carrier_dot: string;
  document_kind: DocumentKind;
  state: DocumentState;
  documenso_document_id: string;
  documenso_template_id: string | null;
  carrier_signing_token: string | null;
  factor_signing_token: string | null;
  carrier_signed_at: Date | null;
  factor_signed_at: Date | null;
  completed_at: Date | null;
  voided_at: Date | null;
  void_reason: string | null;
  notes: string | null;
  payload: Record<string, unknown> | null;
  sent_at: Date;
  updated_at: Date;
}

export interface FactorPartnerConfigRow {
  factor_slug: string;
  documenso_noa_template_id: string | null;
  documenso_master_agreement_template_id: string | null;
  documenso_addendum_template_id: string | null;
  documenso_side_letter_template_id: string | null;
  updated_at: Date;
}

export interface FactorDocumentEventRow {
  id: string;
  document_id: string;
  event_type: string;
  actor: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: Date;
}

/**
 * Returns true when the given document kind requires factor countersign.
 * NOA is always dual-signer (carrier + factor).
 * Other kinds default to single-signer unless the Documenso template has multiple recipients.
 */
export function documentRequiresFactorCountersign(kind: DocumentKind): boolean {
  return kind === 'noa';
}

/**
 * Returns the template ID column name for a given document kind.
 */
export function templateIdColumnForKind(
  kind: DocumentKind,
): keyof Pick<
  FactorPartnerConfigRow,
  | 'documenso_noa_template_id'
  | 'documenso_master_agreement_template_id'
  | 'documenso_addendum_template_id'
  | 'documenso_side_letter_template_id'
> | null {
  switch (kind) {
    case 'noa':
      return 'documenso_noa_template_id';
    case 'master_agreement':
      return 'documenso_master_agreement_template_id';
    case 'addendum':
      return 'documenso_addendum_template_id';
    case 'side_letter':
      return 'documenso_side_letter_template_id';
    default:
      return null;
  }
}
