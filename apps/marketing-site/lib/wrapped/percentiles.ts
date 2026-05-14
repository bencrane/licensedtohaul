// FMCSA cohort percentile tables.
//
// v1: rough estimates from FMCSA-published industry stats (SAFER, Pocket Guide,
// Large Truck and Bus Crash Facts). These are believable, defensible, and
// directionally correct for marketing copy.
//
// v2 — wire to a live cohort substrate that recomputes percentiles from the
// actual FMCSA registry. Replace the lookup tables below with a query, keep
// the function signatures stable.

/** What percentile is `years` of authority age among active US carriers? */
export function yearsPercentile(years: number): number {
  if (years >= 25) return 95;
  if (years >= 20) return 92;
  if (years >= 17) return 87;
  if (years >= 12) return 78;
  if (years >= 8) return 65;
  if (years >= 5) return 50;
  if (years >= 3) return 35;
  if (years >= 1) return 20;
  return 10;
}

/** What percentile is `oosRate` (vehicle OOS %) — lower is better. */
export function safetyPercentile(oosRate: number): number {
  if (oosRate <= 0) return 99;
  if (oosRate <= 5) return 92;
  if (oosRate <= 10) return 78;
  if (oosRate <= 15) return 65;
  if (oosRate <= 21) return 50; // FMCSA national average
  if (oosRate <= 30) return 30;
  return 15;
}

/** Insurance percentile — anything above FMCSA $750K minimum is above the bar. */
export function insurancePercentile(bipdAmount: number): number {
  if (bipdAmount >= 5_000_000) return 98;
  if (bipdAmount >= 2_000_000) return 90;
  if (bipdAmount >= 1_000_000) return 72;
  if (bipdAmount >= 750_000) return 35;
  return 10;
}

/** Fleet size bucket — share of US carriers in this band. */
export function fleetBucket(powerUnits: number): {
  label: string;
  share: number; // 0-100, share of US carriers in this bucket
} {
  if (powerUnits >= 100)
    return { label: "Large fleet", share: 0.5 };
  if (powerUnits >= 21)
    return { label: "Regional fleet", share: 1.5 };
  if (powerUnits >= 7)
    return { label: "Mid-size operator", share: 6 };
  if (powerUnits >= 2)
    return { label: "Small fleet", share: 22 };
  return { label: "Single-truck owner-operator", share: 70 };
}

/** Pretty: 87 → "13%" (since being in top 13% reads better than 87th percentile). */
export function topPercent(percentile: number): number {
  return Math.max(1, 100 - percentile);
}

/** Pretty: 11.1 → "0.53× the industry average" for vehicle OOS. */
export function ratioToAverage(oosRate: number): number {
  const average = 21;
  if (average === 0) return 1;
  return Math.round((oosRate / average) * 100) / 100;
}

/** Pretty distance-equivalent for days. Earth circumference ≈ 24,901 mi. */
export function daysAsEarthOrbits(days: number, avgMilesPerDay = 250): number {
  const miles = days * avgMilesPerDay;
  return Math.round((miles / 24_901) * 10) / 10;
}

/** "30% of US carriers go 2+ years without updating MCS-150" — FMCSA registry stat. */
export const MCS150_LAPSE_RATE = 30;

/** FMCSA Pocket Guide: industry-wide vehicle OOS average. */
export const NATIONAL_VEHICLE_OOS_AVG = 21;

/** FMCSA minimum BIPD for general-freight carriers. */
export const FMCSA_BIPD_MINIMUM = 750_000;
