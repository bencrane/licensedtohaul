export interface DisbursementRow {
  id: string;
  factor_slug: string;
  carrier_dot: string;
  amount_cents: number;
  disbursed_at: string; // date string YYYY-MM-DD
  reference_id: string | null;
  source: 'manual' | 'webhook';
  status: 'observed' | 'reversed';
  observed_at: Date;
}

export interface RecordDisbursementInput {
  factorSlug: string;
  carrierDot: string;
  /** Dollar amount (e.g. 1500.00) — converted to cents internally */
  amount: number;
  disbursedAt: string; // YYYY-MM-DD
  referenceId?: string;
  source?: 'manual' | 'webhook';
}
