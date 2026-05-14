/**
 * Live FMCSA dashboard fetcher. Server-side only — runs inside the
 * dashboard page's React Server Component. Calls DEX's
 * GET /api/v1/fmcsa/carriers/{dot_number} directly with a service token
 * (FMCSA_API_SERVICE_TOKEN), maps the substrate envelope to the existing
 * DashboardData shape, and falls back to the mock for fields the substrate
 * doesn't surface.
 *
 * The substrate is data-engine-x's DuckDB views over R2 daily Parquet
 * (fmcsa-derived/*). It gives us live identity + authority history +
 * insurance + safety BASICs + recent inspections + crashes. Compliance
 * deadlines (IFTA, IRP, D&A), inbox, feed events, and notification prefs
 * are NOT in the substrate — those still flow from the mock until separate
 * substrates ship.
 *
 * When env.FMCSA_API_BASE_URL or env.FMCSA_API_SERVICE_TOKEN is unset OR
 * the upstream call fails, falls back to getMockDashboard().
 */
import { env } from "@/lib/env";
import { getMockDashboard, type DashboardData, type HealthStatus } from "@/lib/mock-dashboard";

// Envelope shape returned by DEX under `.data` for
// GET /api/v1/fmcsa/carriers/{dot_number}. See
// apps/data-engine-x/app/services/fmcsa_mv_detail.py::get_carrier_detail.
type SubstrateEnvelope = {
  carrier: Record<string, unknown> & {
    hazmat_flag?: boolean;
    operating_class?: string;
    operating_states?: string[];
  };
  authorities: Array<Record<string, unknown>>;
  insurance_active: Array<Record<string, unknown>>;
  insurance_history: Array<Record<string, unknown>>;
  safety_basics: Record<string, unknown> | null;
  inspections_recent: Array<Record<string, unknown>>;
  crashes_recent: Array<Record<string, unknown>>;
  boc3?: {
    process_agent_name?: string;
    process_agent_street?: string;
    process_agent_city?: string;
    process_agent_state?: string;
    process_agent_zip?: string;
  } | null;
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function n(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function formatFmcsaDate(raw: string): string {
  if (!raw) return "";
  if (/^\d{8}/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const date = new Date(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T00:00:00Z`);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return raw;
}

function daysSince(raw: string): number {
  if (!raw) return 0;
  let isoString: string | null = null;
  if (/^\d{8}/.test(raw)) {
    isoString = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00Z`;
  } else {
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) isoString = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T00:00:00Z`;
  }
  if (!isoString) return 0;
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86_400_000));
}

/** Days from now until ``raw`` (positive for future, negative for past, 0 if unparseable). */
function daysUntil(raw: string): number {
  if (!raw) return 0;
  let isoString: string | null = null;
  if (/^\d{8}/.test(raw)) {
    isoString = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00Z`;
  } else {
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) isoString = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T00:00:00Z`;
  }
  if (!isoString) return 0;
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return 0;
  return Math.floor((then.getTime() - Date.now()) / 86_400_000);
}

function mapOperatingClass(code: string | undefined | null): string {
  if (!code) return "";
  const map: Record<string, string> = {
    A: "Interstate / For-Hire",
    B: "Intrastate / Hazmat",
    C: "Intrastate / Non-Hazmat",
    interstate: "Interstate / For-Hire",
    intrastate_hazmat: "Intrastate / Hazmat",
    intrastate_non_haz: "Intrastate / Non-Hazmat",
  };
  return map[code] ?? "";
}

function mergeEnvelope(envelope: SubstrateEnvelope, mockTemplate: DashboardData): DashboardData {
  const c = envelope.carrier;
  const merged: DashboardData = { ...mockTemplate };

  const dot = s(c.dot_number) || mockTemplate.carrier.dotNumber;
  const activeAuth = envelope.authorities.find((a) => {
    const final = s(a.final_action).toUpperCase();
    return final === "" || final === "DISCONTINUED REVOCATION" || final === "GRANT";
  }) ?? envelope.authorities[0];
  const mcNumber = activeAuth?.docket_number ? s(activeAuth.docket_number) : mockTemplate.carrier.mcNumber;

  const authorityTypes = Array.from(
    new Set(
      envelope.authorities
        .filter((a) => {
          const final = s(a.final_action).toUpperCase();
          return final === "" || final === "DISCONTINUED REVOCATION" || final === "GRANT";
        })
        .map((a) => s(a.authority_type))
        .filter((t) => t.length > 0),
    ),
  );

  const grantEvents = envelope.authorities.filter(
    (a) => s(a.original_action).toUpperCase().includes("GRANT"),
  );
  const grantedDates = grantEvents
    .map((a) => s(a.original_action_served_date))
    .filter((d) => d.length > 0);
  const earliestGrant = grantedDates.sort()[0] ?? "";
  const authorityGranted = formatFmcsaDate(earliestGrant) || mockTemplate.carrier.authorityGranted;

  let authorityAge = mockTemplate.carrier.authorityAge;
  if (earliestGrant) {
    const days = daysSince(earliestGrant);
    if (days > 0) {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      authorityAge = { years, months };
    }
  }

  const status: typeof mockTemplate.carrier.status =
    authorityTypes.length > 0 ? "active" : mockTemplate.carrier.status;

  merged.carrier = {
    ...mockTemplate.carrier,
    dotNumber: dot,
    mcNumber,
    legalName: s(c.legal_name) || mockTemplate.carrier.legalName,
    dba: s(c.dba_name) || mockTemplate.carrier.dba,
    status,
    authorityTypes: authorityTypes.length > 0 ? authorityTypes : mockTemplate.carrier.authorityTypes,
    authorityGranted,
    authorityAge,
    powerUnits: n(c.power_units) || mockTemplate.carrier.powerUnits,
    drivers: n(c.driver_total) || mockTemplate.carrier.drivers,
    domicileState: s(c.physical_state) || mockTemplate.carrier.domicileState,
    hazmatEndorsed: c.hazmat_flag !== undefined && c.hazmat_flag !== null ? Boolean(c.hazmat_flag) : mockTemplate.carrier.hazmatEndorsed,
    refreshedAt: "today",
    legalAddress: {
      street: s(c.physical_street) || mockTemplate.carrier.legalAddress.street,
      city: s(c.physical_city) || mockTemplate.carrier.legalAddress.city,
      state: s(c.physical_state) || mockTemplate.carrier.legalAddress.state,
      zip: s(c.physical_zip) || mockTemplate.carrier.legalAddress.zip,
    },
    phone: s(c.phone) || mockTemplate.carrier.phone,
    emailOnFile: s(c.email_address) || mockTemplate.carrier.emailOnFile,
    carrierOperation: mapOperatingClass(s(c.operating_class)) || mockTemplate.carrier.carrierOperation,
    operatingStates: Array.isArray(c.operating_states) && c.operating_states.length > 0
      ? (c.operating_states as string[])
      : mockTemplate.carrier.operatingStates,
  };

  const mcs150Raw = s(c.mcs150_date);
  if (mcs150Raw) {
    merged.mcs150 = {
      filedAt: formatFmcsaDate(mcs150Raw),
      daysSinceFiled: daysSince(mcs150Raw),
      nextDueIn: Math.max(0, 730 - daysSince(mcs150Raw)),
      status: daysSince(mcs150Raw) < 600 ? "good" : daysSince(mcs150Raw) < 700 ? "warn" : "alert",
    };
  }

  // Primary BIPD policy first; many for-hire carriers carry BIPD/Primary + BIPD/Excess.
  const primary =
    envelope.insurance_active.find((p) => s(p.insurance_type_description).toUpperCase().includes("PRIMARY")) ??
    envelope.insurance_active[0];
  if (primary) {
    const bipdMax = n(primary.bipd_maximum_limit) * 1000;
    const effective = formatFmcsaDate(s(primary.effective_date));
    const cancelRaw = s(primary.cancel_effective_date);
    // FMCSA convention: cancel_effective_date is the policy's scheduled expiry.
    // For active policies in good standing it's a future date; daysUntil returns positive.
    const daysToExpiration = cancelRaw ? daysUntil(cancelRaw) : 365;
    const expires = cancelRaw ? formatFmcsaDate(cancelRaw) : "—";
    const status: HealthStatus =
      daysToExpiration > 90 ? "good" : daysToExpiration > 30 ? "warn" : "alert";
    merged.insurance = {
      ...mockTemplate.insurance,
      bipdLimit: bipdMax > 0 ? `$${bipdMax.toLocaleString()}` : mockTemplate.insurance.bipdLimit,
      insurer: s(primary.insurance_company_name) || mockTemplate.insurance.insurer,
      effective: effective || mockTemplate.insurance.effective,
      expires,
      daysToExpiration: Math.max(0, daysToExpiration),
      status,
      policyNumber: s(primary.policy_number) || mockTemplate.insurance.policyNumber,
      history: envelope.insurance_history.slice(0, 5).map((h) => ({
        type: s(h.insurance_type_description) || "Insurance",
        insurer: s(h.insurance_company_name),
        effective: formatFmcsaDate(s(h.effective_date)),
        expired: s(h.cancel_effective_date) ? formatFmcsaDate(s(h.cancel_effective_date)) : "—",
      })),
    };
  }

  if (envelope.safety_basics) {
    const sb = envelope.safety_basics;
    // Helper: preserve null when FMCSA hasn't published a percentile for this carrier
    // (low-volume carriers don't get CSA scoring). Returning 0 would render as
    // "0% On track" — misleading, since the score is unknown, not zero.
    const pct = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const x = typeof v === "number" ? v : Number(v);
      return Number.isFinite(x) ? x : null;
    };
    const statusFor = (p: number | null): HealthStatus =>
      p === null ? "good" : p > 80 ? "alert" : p > 65 ? "warn" : "good";

    const basics: typeof mockTemplate.safety.basics = [
      { name: "Unsafe Driving",        percentile: pct(sb.unsafe_driving_percentile),         status: "good", trend: "flat", trendDelta: 0 },
      { name: "Hours-of-Service",      percentile: pct(sb.hos_percentile),                    status: "good", trend: "flat", trendDelta: 0 },
      { name: "Driver Fitness",        percentile: pct(sb.driver_fitness_percentile),         status: "good", trend: "flat", trendDelta: 0 },
      { name: "Controlled Substances", percentile: pct(sb.controlled_substances_percentile),  status: "good", trend: "flat", trendDelta: 0 },
      { name: "Vehicle Maintenance",   percentile: pct(sb.vehicle_maintenance_percentile),    status: "good", trend: "flat", trendDelta: 0 },
    ];
    for (const b of basics) b.status = statusFor(b.percentile);

    // Worst = highest percentile (CSA scoring: 100 = worst). When all are null
    // (carrier below SMS volume threshold), we surface a "not rated" tile so the
    // dashboard never shows a fabricated 0% or mock percentile.
    const rated = basics.filter((b) => b.percentile !== null);
    const worst = rated.length > 0
      ? rated.reduce((acc, b) => ((b.percentile ?? 0) > (acc.percentile ?? 0) ? b : acc))
      : { name: "Not rated", percentile: null, status: "good" as HealthStatus, trend: "flat" as const, trendDelta: 0 };
    merged.worstBasic = worst;

    // Real vehicle OOS rate from carrier-level inspection totals. Falls back to
    // the mock only when SMS has no totals (e.g., brand-new carriers).
    const vehInsp = n(sb.vehicle_inspection_total);
    const vehOos = n(sb.vehicle_oos_inspection_total);
    const drvInsp = n(sb.driver_inspection_total);
    const drvOos = n(sb.driver_oos_inspection_total);

    merged.safety = {
      ...mockTemplate.safety,
      basics,
      inspectionsVehicle24mo: vehInsp || mockTemplate.safety.inspectionsVehicle24mo,
      inspectionsDriver24mo: drvInsp || mockTemplate.safety.inspectionsDriver24mo,
      vehicleOosRate: vehInsp > 0 ? +(vehOos / vehInsp * 100).toFixed(1) : mockTemplate.safety.vehicleOosRate,
      driverOosRate: drvInsp > 0 ? +(drvOos / drvInsp * 100).toFixed(1) : mockTemplate.safety.driverOosRate,
      crashList: envelope.crashes_recent.slice(0, 10).map((cr) => ({
        id: s(cr.crash_id),
        date: formatFmcsaDate(s(cr.report_date)),
        state: s(cr.state),
        location: s(cr.location) || s(cr.city),
        severity: n(cr.fatalities) > 0 ? "fatal" : n(cr.injuries) > 0 ? "injury" : "tow-away",
        ooss: false,
        reportNumber: s(cr.report_number),
        hazmat: s(cr.hazmat_released).toUpperCase() === "Y",
      })),
      inspectionList: envelope.inspections_recent.slice(0, 10).map((ins) => ({
        id: s(ins.inspection_id),
        date: formatFmcsaDate(s(ins.insp_date)),
        state: s(ins.report_state),
        location: s(ins.location_desc) || s(ins.location),
        level: (n(ins.inspection_level) || 2) as 1 | 2 | 3 | 4 | 5 | 6,
        type: "vehicle+driver",
        vehicleViolations: n(ins.vehicle_violation_total),
        driverViolations: n(ins.driver_violation_total),
        ooss: n(ins.oos_total) > 0,
      })),
    };
  }

  // BOC-3: real process agent + address from DEX when present; filedDate stays mock (D2).
  if (envelope.boc3) {
    const boc3Parts = [
      envelope.boc3.process_agent_street,
      envelope.boc3.process_agent_city,
      envelope.boc3.process_agent_state,
      envelope.boc3.process_agent_zip,
    ].filter(Boolean).join(", ");
    merged.compliance = {
      ...merged.compliance,
      boc3: {
        ...mockTemplate.compliance.boc3,
        status: "filed",
        agent: s(envelope.boc3.process_agent_name) || mockTemplate.compliance.boc3.agent,
        agentAddress: boc3Parts || mockTemplate.compliance.boc3.agentAddress,
        // filedDate intentionally kept from mock — no filed_date in boc3_awh substrate (D2)
        filedDate: mockTemplate.compliance.boc3.filedDate,
      },
    };
  }

  return merged;
}

/**
 * Primary dashboard accessor — used by the dashboard page server-side.
 * Calls DEX (api.dataengine.run) directly with a service token. Falls back
 * to getMockDashboard() when env.FMCSA_API_BASE_URL or
 * env.FMCSA_API_SERVICE_TOKEN is unset, the DOT is empty, or the upstream
 * isn't reachable.
 */
export async function getDashboard(dotNumber: string): Promise<DashboardData> {
  const cleanDot = (dotNumber ?? "").replace(/\D/g, "");
  const mockTemplate = getMockDashboard(cleanDot);

  const baseUrl = env.FMCSA_API_BASE_URL;
  const serviceToken = env.FMCSA_API_SERVICE_TOKEN;
  if (!baseUrl || !serviceToken || !cleanDot) {
    return mockTemplate;
  }

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/fmcsa/carriers/${cleanDot}`;
    const resp = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${serviceToken}`,
      },
      cache: "no-store",
    });
    if (!resp.ok) {
      console.warn(`dex_fetch_failed status=${resp.status} dot=${cleanDot}`);
      return mockTemplate;
    }
    const body = (await resp.json()) as { data: SubstrateEnvelope };
    if (!body?.data?.carrier) {
      console.warn(`dex_response_malformed dot=${cleanDot}`);
      return mockTemplate;
    }
    return mergeEnvelope(body.data, mockTemplate);
  } catch (err) {
    console.warn(`dex_fetch_error dot=${cleanDot} err=`, err);
    return mockTemplate;
  }
}
