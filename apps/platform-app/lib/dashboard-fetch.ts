/**
 * Live FMCSA dashboard fetcher. Server-side only — runs inside the
 * dashboard page's React Server Component. Calls hq-x's
 * /api/fmcsa/carrier/{dot} endpoint with the user's Supabase JWT
 * forwarded as Bearer, maps the substrate envelope to the existing
 * DashboardData shape the page components already consume, and falls
 * back to the mock for fields the substrate doesn't surface yet.
 *
 * The substrate (data-engine-x L1 views over sorted derived parquet on R2)
 * gives us live identity + authority + insurance + safety BASICs + recent
 * inspections + recent crashes. Compliance deadlines (IFTA, IRP, D&A),
 * inbox, feed events, and notification prefs are NOT in the substrate —
 * those still flow from the mock until separate substrates ship.
 *
 * When env.HQX_API_BASE_URL is unset OR the upstream call fails, falls
 * back to getMockDashboard() so the page never breaks. That makes local
 * development against the static fixture continue to work.
 */
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getMockDashboard, type DashboardData } from "@/lib/mock-dashboard";

// Substrate envelope shape (what hq-x returns under .data, matching DEX's
// /api/v1/fmcsa/carrier-view/{dot} response).
type SubstrateEnvelope = {
  carrier: Record<string, unknown>;
  authorities: Array<Record<string, unknown>>;
  insurance_active: Array<Record<string, unknown>>;
  insurance_history: Array<Record<string, unknown>>;
  safety_basics: Record<string, unknown> | null;
  inspections_recent: Array<Record<string, unknown>>;
  crashes_recent: Array<Record<string, unknown>>;
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
    powerUnits: n(c.power_units_int ?? c.power_units) || mockTemplate.carrier.powerUnits,
    drivers: n(c.total_drivers_int ?? c.total_drivers) || mockTemplate.carrier.drivers,
    domicileState: s(c.phy_state) || mockTemplate.carrier.domicileState,
    hazmatEndorsed: s(c.hm_ind).toUpperCase() === "Y",
    refreshedAt: "today",
    legalAddress: {
      street: s(c.phy_street) || mockTemplate.carrier.legalAddress.street,
      city: s(c.phy_city) || mockTemplate.carrier.legalAddress.city,
      state: s(c.phy_state) || mockTemplate.carrier.legalAddress.state,
      zip: s(c.phy_zip) || mockTemplate.carrier.legalAddress.zip,
    },
    phone: s(c.phone) || mockTemplate.carrier.phone,
    emailOnFile: s(c.email_address) || mockTemplate.carrier.emailOnFile,
    carrierOperation:
      s(c.operating_radius_class) === "interstate"
        ? "Interstate / For-Hire"
        : s(c.operating_radius_class) === "intrastate_hazmat"
        ? "Intrastate Hazmat"
        : s(c.operating_radius_class) === "intrastate_non_haz"
        ? "Intrastate"
        : mockTemplate.carrier.carrierOperation,
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

  const policy = envelope.insurance_active[0];
  if (policy) {
    const bipdMax = n(policy.bipd_maximum_limit) * 1000;
    const effective = formatFmcsaDate(s(policy.effective_date));
    const cancelRaw = s(policy.cancel_effective_date);
    const expires = cancelRaw ? formatFmcsaDate(cancelRaw) : "—";
    const daysToExpiration = cancelRaw ? Math.max(0, -daysSince(cancelRaw)) : 365;
    merged.insurance = {
      ...mockTemplate.insurance,
      bipdLimit: bipdMax > 0 ? `$${bipdMax.toLocaleString()}` : mockTemplate.insurance.bipdLimit,
      insurer: s(policy.insurance_company_name) || mockTemplate.insurance.insurer,
      effective: effective || mockTemplate.insurance.effective,
      expires,
      daysToExpiration,
      status: daysToExpiration > 90 ? "good" : daysToExpiration > 30 ? "warn" : "alert",
      policyNumber: s(policy.policy_number) || mockTemplate.insurance.policyNumber,
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
    const basics: typeof mockTemplate.safety.basics = [
      { name: "Unsafe Driving", percentile: n(sb.unsafe_driving_percentile), status: "good", trend: "flat", trendDelta: 0 },
      { name: "Hours-of-Service", percentile: n(sb.hos_percentile), status: "good", trend: "flat", trendDelta: 0 },
      { name: "Driver Fitness", percentile: n(sb.driver_fitness_percentile), status: "good", trend: "flat", trendDelta: 0 },
      { name: "Controlled Substances", percentile: n(sb.controlled_substances_percentile), status: "good", trend: "flat", trendDelta: 0 },
      { name: "Vehicle Maintenance", percentile: n(sb.vehicle_maintenance_percentile), status: "good", trend: "flat", trendDelta: 0 },
    ];
    for (const b of basics) {
      b.status = b.percentile > 80 ? "alert" : b.percentile > 65 ? "warn" : "good";
    }
    const worst = [...basics].sort((a, b) => b.percentile - a.percentile)[0];
    merged.worstBasic = worst;
    merged.safety = {
      ...mockTemplate.safety,
      basics,
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
        vehicleViolations: n(ins.vehicle_violation_total ?? ins.vehicle_viol_total),
        driverViolations: n(ins.driver_violation_total ?? ins.driver_viol_total),
        ooss: n(ins.oos_total) > 0,
      })),
    };
  }

  return merged;
}

async function _getAccessToken(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.access_token) return null;
    return data.session.access_token;
  } catch {
    return null;
  }
}

/**
 * Primary dashboard accessor — used by the dashboard page server-side.
 * Forwards the user's Supabase JWT to hq-x. Falls back to mock when
 * env.HQX_API_BASE_URL is unset or the upstream isn't reachable.
 */
export async function getDashboard(dotNumber: string): Promise<DashboardData> {
  const cleanDot = (dotNumber ?? "").replace(/\D/g, "");
  const mockTemplate = getMockDashboard(cleanDot);

  const baseUrl = env.HQX_API_BASE_URL;
  if (!baseUrl || !cleanDot) {
    return mockTemplate;
  }

  const accessToken = await _getAccessToken();
  if (!accessToken) {
    // No authenticated session yet — fall back to mock so the dashboard
    // can still render (e.g. during pre-auth preview or local dev without
    // a real session). The /dashboard route should be gated by middleware
    // in normal operation.
    return mockTemplate;
  }

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/fmcsa/carrier/${cleanDot}`;
    const resp = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
    if (!resp.ok) {
      console.warn(`hqx_fetch_failed status=${resp.status} dot=${cleanDot}`);
      return mockTemplate;
    }
    const body = (await resp.json()) as { data: SubstrateEnvelope };
    if (!body?.data?.carrier) {
      console.warn(`hqx_response_malformed dot=${cleanDot}`);
      return mockTemplate;
    }
    return mergeEnvelope(body.data, mockTemplate);
  } catch (err) {
    console.warn(`hqx_fetch_error dot=${cleanDot} err=`, err);
    return mockTemplate;
  }
}
