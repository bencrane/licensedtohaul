/**
 * Carrier lifecycle stage computation — pure function over query result rows.
 *
 * Stage rules (canonical):
 *   offboarded  — no active FoR row OR row.status = 'revoked'
 *   onboarding  — latest noa_envelope.state != 'completed' (or null)
 *   active      — disbursement with disbursed_at >= CURRENT_DATE - INTERVAL '30 days'
 *   quiet       — none of the above (FoR active, NOA completed, no recent disbursement)
 */

export type CarrierStage = 'onboarding' | 'active' | 'quiet' | 'offboarded';

export interface PipelineCarrierRow {
  carrier_dot: string;
  carrier_name: string;
  for_status: 'active' | 'revoked' | null;
  noa_state: string | null;
  last_disbursement_at: string | null; // ISO date string (YYYY-MM-DD) or null
  assigned_at: Date | null;
  revoked_at: Date | null;
}

/**
 * Compute the carrier lifecycle stage from a joined query row.
 * Pure — no DB calls, no Date.now() (asOf defaults to today for testability).
 */
export function computeCarrierStage(
  row: Pick<PipelineCarrierRow, 'for_status' | 'noa_state' | 'last_disbursement_at'>,
  asOf: Date = new Date(),
): CarrierStage {
  // Rule 1: no active FoR or explicitly revoked → offboarded
  if (!row.for_status || row.for_status === 'revoked') {
    return 'offboarded';
  }

  // Rule 2: NOA not completed (null treated as not completed) → onboarding
  if (row.noa_state !== 'completed') {
    return 'onboarding';
  }

  // Rule 3: disbursement within 30 days (inclusive) → active
  if (row.last_disbursement_at) {
    const disbDate = new Date(row.last_disbursement_at + 'T00:00:00Z');
    const cutoff = new Date(asOf);
    // Set cutoff to start of day 30 days ago (UTC)
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCDate(cutoff.getUTCDate() - 30);
    if (disbDate >= cutoff) {
      return 'active';
    }
  }

  // Rule 4: default → quiet
  return 'quiet';
}
