import { Pool } from 'pg';
import { getDisbursementsInWindow } from '@/lib/disbursements/actions';

export interface ReconciliationResult {
  factorSlug: string;
  windowStart: string;       // YYYY-MM-DD
  windowEnd: string;         // YYYY-MM-DD
  disbursementCount: number;
  totalDisbursedCents: number;
  disbursementSkimCents: number;
  platformFeeCents: number;
  totalDueCents: number;
  disbursementBps: number;
}

function getPool(): Pool {
  const connString = process.env.HQX_DB_URL_POOLED;
  if (!connString) throw new Error('HQX_DB_URL_POOLED not set');
  return new Pool({ connectionString: connString, max: 2 });
}

let _pool: Pool | null = null;
function defaultPool(): Pool {
  if (!_pool) _pool = getPool();
  return _pool;
}

/**
 * Compute reconciliation for a factor for the billing cycle containing asOf.
 * Reads billing_cycle_anchor from factor_billing_config to determine the quarter window.
 */
export async function getReconciliation(
  factorSlug: string,
  asOf: Date = new Date(),
  opts?: { pool?: Pool; schema?: string },
): Promise<ReconciliationResult> {
  const SCHEMA = opts?.schema ?? process.env.LTH_SCHEMA ?? 'lth';
  const db = opts?.pool ?? defaultPool();

  // Load billing config
  const { rows: configRows } = await db.query<{
    platform_fee_cents: number;
    disbursement_bps: number;
    billing_cycle_anchor: string;
  }>(
    `SELECT platform_fee_cents, disbursement_bps, billing_cycle_anchor::text
     FROM "${SCHEMA}".factor_billing_config
     WHERE factor_slug = $1`,
    [factorSlug],
  );

  const config = configRows[0] ?? {
    platform_fee_cents: 250000,
    disbursement_bps: 50,
    billing_cycle_anchor: asOf.toISOString().slice(0, 10),
  };

  // Determine the quarter window that contains asOf, anchored at billing_cycle_anchor.
  // billing_cycle_anchor is the start of the first quarter (e.g. 2026-04-01).
  // We find which quarter (0, 1, 2, ...) asOf falls in relative to the anchor.
  const anchor = new Date(config.billing_cycle_anchor);
  const anchorMs = anchor.getTime();
  const asOfMs = asOf.getTime();

  // Quarters are 3 months each. Find the current quarter relative to the anchor date.
  const anchorYear = anchor.getUTCFullYear();
  const anchorMonth = anchor.getUTCMonth(); // 0-indexed
  const asOfYear = asOf.getUTCFullYear();
  const asOfMonth = asOf.getUTCMonth();

  // Total months difference
  const monthsDiff = (asOfYear - anchorYear) * 12 + (asOfMonth - anchorMonth);
  const quartersFromAnchor = Math.max(0, Math.floor(monthsDiff / 3));

  // Window start: anchor + quartersFromAnchor * 3 months
  const windowStartMonth = anchorMonth + quartersFromAnchor * 3;
  const windowStartYear = anchorYear + Math.floor(windowStartMonth / 12);
  const windowStartMonthNorm = windowStartMonth % 12;

  const windowStart = new Date(Date.UTC(windowStartYear, windowStartMonthNorm, 1));
  const windowEnd = new Date(Date.UTC(windowStartYear, windowStartMonthNorm + 3, 0)); // last day of month

  const windowStartStr = windowStart.toISOString().slice(0, 10);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);

  // Fetch disbursements in window
  const disbursements = await getDisbursementsInWindow(factorSlug, windowStartStr, windowEndStr, {
    pool: db,
    schema: SCHEMA,
  });

  const totalDisbursedCents = disbursements.reduce((sum, d) => sum + Number(d.amount_cents), 0);
  const disbursementSkimCents = Math.round(totalDisbursedCents * (Number(config.disbursement_bps) / 10000));
  const platformFeeCents = Number(config.platform_fee_cents);
  const totalDueCents = disbursementSkimCents + platformFeeCents;

  return {
    factorSlug,
    windowStart: windowStartStr,
    windowEnd: windowEndStr,
    disbursementCount: disbursements.length,
    totalDisbursedCents,
    disbursementSkimCents,
    platformFeeCents,
    totalDueCents,
    disbursementBps: Number(config.disbursement_bps),
  };
}

/** Format cents as "$X,XXX.XX" */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
