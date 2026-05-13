// In-memory mock transfers for factor partner slugs (rts-financial, tbs-factoring, apex-capital).
// The real Postgres path (listTransfersForOrg) is only used for non-factor slugs (e.g. brookhaven).

import type { TransferRow } from "@/lib/transfers/types";

export const FACTOR_SLUGS = new Set(["rts-financial", "tbs-factoring", "apex-capital"]);

// Module-scope mutable store — singleton for the session.
const transfersBySlug: Map<string, TransferRow[]> = new Map();

export function pushFactorTransfer(params: {
  factorSlug: string;
  carrierDot: string;
  quoteId: string;
  submittedAt: string;
  state: string;
}): void {
  const entry: TransferRow = {
    id: `xfer-${params.quoteId}-${Date.now()}`,
    partner_org_id: params.factorSlug,
    carrier_org_id: params.carrierDot,
    disposition: "new",
    match_criteria: [
      `Carrier submitted quote ${params.quoteId} via Licensed to Haul`,
      `USDOT ${params.carrierDot} — Acme Carrier LLC`,
      `State: ${params.state}`,
    ],
    signals: {
      authority_age_years: 7,
      csa_basic: "HOS 76th pct",
      oos_rate: "0.0%",
    },
    contact_snapshot: {
      name: "Acme Carrier LLC",
      usdot: Number(params.carrierDot),
      domicile: "Dallas, TX",
      equipment_class: "Dry van / Reefer",
      power_units: 8,
      drivers: 11,
      hazmat: false,
      authority_years: 7,
      dba: "Acme Transport",
      phone: "(214) 555-0118",
      email: "ops@acmecarrier.com",
    },
    created_at: params.submittedAt,
    contacted_at: null,
    quoted_at: null,
    closed_at: null,
  };
  const existing = transfersBySlug.get(params.factorSlug) ?? [];
  transfersBySlug.set(params.factorSlug, [entry, ...existing]);
}

export function getMockTransfersForFactor(slug: string): TransferRow[] {
  return transfersBySlug.get(slug) ?? [];
}
