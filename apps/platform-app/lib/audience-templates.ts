import type { AudienceCriteria } from './audience-pricing';

export type VerticalFit = 'factoring' | 'insurance' | 'broker' | 'shipper';

export type AudienceTemplate = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  verticalFit: VerticalFit[];
  criteria: AudienceCriteria;
  minTransferCount: number;
  recommendedTransferCount: number;
  recommendedFulfillmentDays: 30 | 45 | 90;
};

export const AUDIENCE_TEMPLATES: AudienceTemplate[] = [
  {
    id: 'active-otr-southeast',
    name: 'Active OTR · Southeast',
    tagline: 'Steady-state mid-fleet carriers across TX, GA, FL',
    description:
      'Established small-to-mid OTR fleets running freight across the Southeast. High-volume operators that need ongoing services.',
    verticalFit: ['factoring', 'insurance', 'broker'],
    criteria: {
      states: ['TX', 'GA', 'FL', 'NC', 'TN'],
      equipment: ['Dry van', 'Reefer'],
      fleetMin: 10,
      fleetMax: 50,
      authorityYearsMin: 3,
      hazmat: 'either',
    },
    minTransferCount: 25,
    recommendedTransferCount: 50,
    recommendedFulfillmentDays: 45,
  },
  {
    id: 'owner-operators-nationwide',
    name: 'Owner-Operators · Nationwide',
    tagline: 'Single-truck operators ready for factoring',
    description:
      'New and growing owner-operators running 1–5 power units. Highest factoring intent — cash-flow gap is real at this size.',
    verticalFit: ['factoring'],
    criteria: {
      states: ['TX', 'CA', 'FL', 'IL', 'OH', 'PA', 'GA', 'NC', 'MI', 'AZ', 'WA', 'CO', 'IN', 'TN'],
      equipment: ['Dry van', 'Flatbed', 'Reefer'],
      fleetMin: 1,
      fleetMax: 5,
      authorityYearsMin: 1,
      hazmat: 'either',
    },
    minTransferCount: 50,
    recommendedTransferCount: 100,
    recommendedFulfillmentDays: 45,
  },
  {
    id: 'established-mid-large',
    name: 'Established · Mid-to-Large',
    tagline: 'Multi-equipment, multi-state operators with 5+ years authority',
    description:
      'Stable mid-sized fleets (25–200 PU) running multiple equipment classes. Strong renewal candidates for insurance and long-term factoring.',
    verticalFit: ['insurance', 'factoring', 'broker'],
    criteria: {
      states: ['TX', 'CA', 'FL', 'IL', 'OH', 'PA', 'GA', 'NC', 'MI', 'NY'],
      equipment: ['Dry van', 'Reefer', 'Flatbed'],
      fleetMin: 25,
      fleetMax: 200,
      authorityYearsMin: 5,
      hazmat: 'either',
    },
    minTransferCount: 25,
    recommendedTransferCount: 40,
    recommendedFulfillmentDays: 45,
  },
  {
    id: 'hazmat-specialists',
    name: 'Hazmat Specialists',
    tagline: 'Tanker + hazmat-endorsed carriers nationwide',
    description:
      'Niche audience of hazmat-endorsed tanker operators. Premium insurance prospects, premium freight rates.',
    verticalFit: ['insurance', 'broker'],
    criteria: {
      states: ['TX', 'CA', 'FL', 'IL', 'OH', 'PA', 'GA', 'NC', 'MI', 'NY', 'AZ', 'WA', 'CO', 'IN', 'TN', 'WI', 'MO', 'VA', 'NV', 'MN'],
      equipment: ['Tanker'],
      fleetMin: 5,
      fleetMax: 200,
      authorityYearsMin: 3,
      hazmat: 'required',
    },
    minTransferCount: 20,
    recommendedTransferCount: 30,
    recommendedFulfillmentDays: 90,
  },
  {
    id: 'regional-dry-van-midwest',
    name: 'Regional Dry Van · Midwest',
    tagline: 'IL, OH, IN, MI, WI · 10-50 PU',
    description:
      'Midwest regional dry-van operators. Predictable freight, consistent factoring volume, manageable underwriting risk.',
    verticalFit: ['broker', 'factoring'],
    criteria: {
      states: ['IL', 'OH', 'IN', 'MI', 'WI', 'MN', 'MO'],
      equipment: ['Dry van'],
      fleetMin: 10,
      fleetMax: 50,
      authorityYearsMin: 3,
      hazmat: 'either',
    },
    minTransferCount: 25,
    recommendedTransferCount: 50,
    recommendedFulfillmentDays: 45,
  },
  {
    id: 'reefer-operators-southern',
    name: 'Reefer Operators · Southern',
    tagline: 'Refrigerated carriers along produce + protein lanes',
    description:
      'Southern reefer fleets running produce north and protein south. Higher-revenue carriers with reefer-specific service needs.',
    verticalFit: ['broker', 'insurance'],
    criteria: {
      states: ['TX', 'CA', 'FL', 'GA', 'NC', 'TN', 'AZ'],
      equipment: ['Reefer'],
      fleetMin: 5,
      fleetMax: 50,
      authorityYearsMin: 2,
      hazmat: 'either',
    },
    minTransferCount: 25,
    recommendedTransferCount: 40,
    recommendedFulfillmentDays: 60 as 90, // narrow window — keep 90 in type
  },
  {
    id: 'growing-fleets',
    name: 'Growing Fleets',
    tagline: 'Young authorities expanding fast (5-25 PU, 1-3y old)',
    description:
      'Carriers in growth mode — recently expanded from owner-op to small fleet. Open to new services, sticky once acquired.',
    verticalFit: ['factoring', 'insurance', 'broker'],
    criteria: {
      states: ['TX', 'CA', 'FL', 'IL', 'OH', 'PA', 'GA', 'NC', 'MI', 'NY', 'AZ', 'WA', 'CO', 'IN', 'TN'],
      equipment: ['Dry van', 'Flatbed', 'Reefer'],
      fleetMin: 5,
      fleetMax: 25,
      authorityYearsMin: 1,
      hazmat: 'either',
    },
    minTransferCount: 40,
    recommendedTransferCount: 75,
    recommendedFulfillmentDays: 45,
  },
  {
    id: 'premium-carriers',
    name: 'Premium Carriers',
    tagline: 'Large established fleets, 50+ PU, 7y+ authority',
    description:
      'Top-tier prospects — stable, high-revenue, low-default. Premium insurance, premium freight, premium expectations.',
    verticalFit: ['insurance', 'broker'],
    criteria: {
      states: ['TX', 'CA', 'FL', 'IL', 'OH', 'PA', 'GA', 'NC'],
      equipment: ['Dry van', 'Reefer', 'Flatbed'],
      fleetMin: 50,
      fleetMax: 500,
      authorityYearsMin: 7,
      hazmat: 'either',
    },
    minTransferCount: 15,
    recommendedTransferCount: 25,
    recommendedFulfillmentDays: 45,
  },
];

export function getTemplate(id: string): AudienceTemplate | undefined {
  return AUDIENCE_TEMPLATES.find((t) => t.id === id);
}

export const VERTICAL_LABELS: Record<VerticalFit, string> = {
  factoring: 'Factoring',
  insurance: 'Insurance',
  broker: 'Broker',
  shipper: 'Shipper',
};
