// Shared audience math used by the composer + catalog finalize flow.
// Pure functions — no I/O.

export const STATE_OPTIONS = [
  'TX', 'CA', 'FL', 'IL', 'OH', 'PA', 'GA', 'NC', 'MI', 'NY',
  'AZ', 'WA', 'CO', 'IN', 'TN', 'WI', 'MO', 'VA', 'NV', 'MN',
];
export const EQUIPMENT_OPTIONS = [
  'Dry van',
  'Reefer',
  'Flatbed',
  'Tanker',
  'Auto carrier',
  'Heavy haul',
];
export const POOL_SIZE = 8500;
export const FULFILLMENT_OPTIONS = [30, 45, 90] as const;

export type Hazmat = 'either' | 'required' | 'excluded';

export type AudienceCriteria = {
  states: string[];
  equipment: string[];
  fleetMin: number;
  fleetMax: number;
  authorityYearsMin: number;
  hazmat: Hazmat;
};

export function calcAudienceSize(c: AudienceCriteria): number {
  let size = POOL_SIZE;
  size *=
    c.states.length === 0 ? 0.05 : Math.min(1, c.states.length * 0.045);
  size *=
    c.equipment.length === 0
      ? 0.05
      : Math.min(1, c.equipment.length / EQUIPMENT_OPTIONS.length);
  const fleetRange = Math.max(0, c.fleetMax - c.fleetMin);
  size *= Math.min(1, fleetRange / 250);
  size *= Math.max(0.18, 1 - c.authorityYearsMin * 0.045);
  if (c.hazmat === 'required') size *= 0.18;
  if (c.hazmat === 'excluded') size *= 0.88;
  return Math.max(0, Math.round(size));
}

/**
 * Per-transfer rate, indexed to audience scarcity + fulfillment-window
 * priority. Shorter windows carry a small premium.
 */
export function pricePerTransferCents(
  audience: number,
  windowDays: number,
): number {
  const fraction = Math.min(1, audience / POOL_SIZE);
  const scarcity = 1 + 1.5 * (1 - fraction);
  const windowPremium = windowDays <= 30 ? 1.18 : windowDays <= 45 ? 1.0 : 0.92;
  return Math.round(150_00 * scarcity * windowPremium);
}

export function calcDaysToFill(audience: number, transferCount: number): number {
  if (audience <= 0 || transferCount <= 0) return 0;
  const dailySupply = audience * 0.01;
  if (dailySupply <= 0) return Infinity;
  return Math.ceil(transferCount / dailySupply);
}

export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}
