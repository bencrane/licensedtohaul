// Carrier data for the Wrapped flow.
//
// v1: deterministic mock seeded from the DOT number. Same DOT → same data
// every visit, so URLs are shareable.
//
// v2 — replace getWrappedData() body with a server-side fetch to the FMCSA
// substrate (FMCSA_API_BASE_URL + FMCSA_API_SERVICE_TOKEN, same pattern as
// platform-app's dashboard-fetch.ts). Mock stays as the fallback.

export type WrappedData = {
  dot: string;
  legalName: string;
  dba?: string;
  authorityGranted: Date;
  yearsInBusiness: number;
  daysUnderAuthority: number;
  domicileState: string;
  authorityTypes: string[];

  fleet: {
    powerUnits: number;
    drivers: number;
  };

  safety: {
    vehicleOosRate: number;
    driverOosRate: number;
    inspections24mo: number;
    crashes24mo: number;
  };

  insurance: {
    bipdAmount: number;
    carrier: string;
    expiresAt: Date;
  };

  mcs150: {
    lastFiledDaysAgo: number;
    isCurrent: boolean;
  };
};

const STATES = [
  "TX", "CA", "OH", "IL", "PA", "GA", "TN", "NC", "IN", "FL",
  "MO", "WI", "MI", "AR", "OK", "AZ", "WA", "CO",
];

const INSURANCE_CARRIERS = [
  "Accredited Specialty Insurance Company",
  "Great West Casualty Company",
  "Progressive Commercial",
  "Northland Insurance Company",
  "Canal Insurance Company",
  "National Indemnity Company",
  "Continental Western Group",
  "Lancer Insurance Company",
];

const CARRIER_NAMES = [
  ["Ridgeline Freight LLC", "Ridgeline"],
  ["Brookhaven Transport Co", null],
  ["Summit Haul & Logistics", null],
  ["Coastal Run Trucking Inc", "Coastal Run"],
  ["Prairie Wind Carriers", null],
  ["Redwood Express LLC", "Redwood Express"],
  ["Blackrock Logistics", null],
  ["Westbound Freight Inc", "Westbound"],
  ["Allegheny Hauling LLC", null],
  ["Great Lakes Carriers Co", null],
  ["Piedmont Truck Lines", null],
  ["Mojave Express LLC", "Mojave Express"],
  ["Cascade Mountain Hauling", null],
  ["Heartland Continental Freight", "Heartland Continental"],
  ["Iron Range Trucking", null],
];

/** Mulberry32 — small deterministic PRNG so a DOT yields stable data. */
function seedFrom(dot: string): () => number {
  let a = parseInt(dot, 10) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function gaussian(rng: () => number, mean: number, stdev: number): number {
  // Box-Muller
  const u = 1 - rng();
  const v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdev;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function getWrappedData(dot: string): Promise<WrappedData> {
  const cleanDot = (dot ?? "").replace(/\D/g, "");
  const rng = seedFrom(cleanDot);

  // Years in business: skewed toward 1-10 with a long tail.
  // Use exponential distribution.
  const yearsRaw = -Math.log(1 - rng() * 0.97) * 8;
  const yearsInBusiness = clamp(Math.round(yearsRaw), 1, 45);

  const granted = new Date();
  granted.setUTCFullYear(granted.getUTCFullYear() - yearsInBusiness);
  // Push to a believable month/day
  granted.setUTCMonth(Math.floor(rng() * 12));
  granted.setUTCDate(1 + Math.floor(rng() * 27));

  const days = Math.floor((Date.now() - granted.getTime()) / 86_400_000);

  const [legalName, dba] = pick(rng, CARRIER_NAMES);

  // Fleet — heavy single-truck skew
  const fleetRoll = rng();
  let powerUnits: number;
  if (fleetRoll < 0.6) powerUnits = 1;
  else if (fleetRoll < 0.85) powerUnits = 2 + Math.floor(rng() * 5);
  else if (fleetRoll < 0.96) powerUnits = 7 + Math.floor(rng() * 14);
  else powerUnits = 21 + Math.floor(rng() * 60);

  const drivers = powerUnits + Math.floor(rng() * Math.max(1, powerUnits * 0.4));

  // Safety — most carriers below 20% OOS
  const vehicleOosRate = clamp(gaussian(rng, 14, 8), 0, 50);
  const driverOosRate = clamp(gaussian(rng, 6, 3.5), 0, 25);
  const inspections24mo = Math.floor(powerUnits * (1.5 + rng() * 2));
  const crashes24mo = rng() < 0.85 ? 0 : Math.floor(rng() * 3);

  // Insurance — strongly skewed toward $1M (most-common policy)
  const insuranceRoll = rng();
  let bipdAmount: number;
  if (insuranceRoll < 0.05) bipdAmount = 750_000;
  else if (insuranceRoll < 0.78) bipdAmount = 1_000_000;
  else if (insuranceRoll < 0.94) bipdAmount = 2_000_000;
  else bipdAmount = 5_000_000;

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 30 + Math.floor(rng() * 330));

  const lastFiledDaysAgo = Math.floor(rng() * 600);
  const isCurrent = lastFiledDaysAgo < 730;

  return {
    dot: cleanDot,
    legalName: legalName ?? "Active Motor Carrier",
    dba: dba ?? undefined,
    authorityGranted: granted,
    yearsInBusiness,
    daysUnderAuthority: days,
    domicileState: pick(rng, STATES),
    authorityTypes: rng() > 0.7 ? ["Common", "Contract"] : ["Common"],
    fleet: { powerUnits, drivers },
    safety: {
      vehicleOosRate: Math.round(vehicleOosRate * 10) / 10,
      driverOosRate: Math.round(driverOosRate * 10) / 10,
      inspections24mo,
      crashes24mo,
    },
    insurance: {
      bipdAmount,
      carrier: pick(rng, INSURANCE_CARRIERS),
      expiresAt,
    },
    mcs150: { lastFiledDaysAgo, isCurrent },
  };
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
