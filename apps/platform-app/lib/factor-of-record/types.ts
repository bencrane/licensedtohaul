export interface NoaEnvelopeRow {
  id: string;
  external_id: string;
  carrier_dot: string;
  factor_slug: string;
  load_id: string | null;
  provider: string;
  provider_envelope_id: string | null;
  state: string;
  signed_at: Date | null;
  signer_ip: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FactorOfRecordRow {
  id: string;
  carrier_dot: string;
  factor_slug: string;
  factor_display_name: string;
  status: 'active' | 'revoked';
  assigned_at: Date;
  revoked_at: Date | null;
  noa_envelope_id: string | null;
  created_at: Date;
}

export interface FactorAuditLogRow {
  id: string;
  carrier_dot: string | null;
  factor_slug: string | null;
  event: string;
  payload: Record<string, unknown>;
  noa_envelope_id: string | null;
  for_id: string | null;
  occurred_at: Date;
}

export interface FactorBillingEventRow {
  id: string;
  factor_slug: string;
  event_name: string;
  payload: Record<string, unknown>;
  emitted: boolean;
  emitted_at: Date | null;
  stripe_event_id: string | null;
  created_at: Date;
}

/** FQDN-style factor display names (minimal registry for tests) */
export const FACTOR_DISPLAY_NAMES: Record<string, string> = {
  'apex-capital': 'Apex Capital',
  'triumph-pay': 'Triumph Pay',
  'riviera-finance': 'Riviera Finance',
  'orange-commercial': 'Orange Commercial Capital',
  'triumph-business': 'Triumph Business Capital',
};

export function getFactorDisplayName(slug: string): string {
  return FACTOR_DISPLAY_NAMES[slug] ?? slug;
}
