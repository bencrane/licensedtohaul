// Mock data for the carrier dashboard's Opportunities subpages.
// Each vertical pulls from this file to render real-feeling content.

export type LaneOpportunity = {
  id: string;
  origin: { city: string; state: string };
  destination: { city: string; state: string };
  pickupDate: string;
  equipment: string;
  weightLbs: number;
  miles: number;
  rateUsd: number;
  ratePerMile: number;
  brokerName: string;
  brokerCreditDays: number; // typical days to pay
  brokerCreditTier: "A" | "B" | "C";
  payTerms: string;
  postedRelative: string;
};

export type BrokerCreditEntry = {
  brokerName: string;
  loadsThisYear: number;
  avgPayDays: number;
  tier: "A" | "B" | "C";
  notes: string;
};

export type InsuranceQuote = {
  id: string;
  brokerName: string;
  status: "pending" | "received" | "declined";
  bipdLimit: string;
  cargoLimit: string;
  premiumUsd: number;
  deductibleUsd: number;
  effectiveStart: string;
  notes?: string;
  receivedAt?: string;
};

export type FinancingQuoteStatus =
  | "available"
  | "submitted"
  | "contacted"
  | "underwriting"
  | "approved"
  | "declined"
  | "onboarding"
  | "active"
  | "pending"
  | "received";

export type FinancingQuote = {
  id: string;
  factorName: string;
  factorSlug: string;
  type: "factoring" | "fuel-advance" | "working-capital";
  status: FinancingQuoteStatus;
  rate: string;
  fundingSpeed: string;
  recourseLabel: string;
  monthlyMinimum?: string;
  notes?: string;
  receivedAt?: string;
};

export type FuelProgram = {
  id: string;
  programName: string;
  network: string;
  perGallonOff: number;
  monthlyMinimumGallons: number;
  driverControls: boolean;
  fraudControls: boolean;
  rebatePercent: number;
  estAnnualSavings: number;
};

export type EquipmentOffer = {
  id: string;
  lenderName: string;
  type: "purchase" | "lease-to-own" | "refinance";
  amountUsd: number;
  termMonths: number;
  apr: number;
  prepaymentPenalty: boolean;
  softPullStage: boolean;
  notes?: string;
};

export type CarrierOpportunities = {
  lanes: LaneOpportunity[];
  brokerCredit: BrokerCreditEntry[];
  insurance: {
    activeQuotes: InsuranceQuote[];
    lastQuoteRequestedAt: string;
  };
  financing: {
    currentFactor: { name: string; rate: string; spread: string; monthlyVolume: string } | null;
    activeQuotes: FinancingQuote[];
  };
  fuel: {
    currentProgram: { name: string; network: string; perGallonOff: number; monthlyGallons: number } | null;
    availablePrograms: FuelProgram[];
  };
  equipment: {
    availableOffers: EquipmentOffer[];
    currentNotes: { lender: string; balanceUsd: number; apr: number; termsRemainingMonths: number; unitNumber: string }[];
  };
};

export function getMockOpportunities(): CarrierOpportunities {
  const lanes: LaneOpportunity[] = [
    {
      id: "ln1",
      origin: { city: "Dallas", state: "TX" },
      destination: { city: "Albuquerque", state: "NM" },
      pickupDate: "May 12, 2026",
      equipment: "Dry van",
      weightLbs: 38000,
      miles: 656,
      rateUsd: 2150,
      ratePerMile: 3.28,
      brokerName: "Echo Global Logistics",
      brokerCreditDays: 22,
      brokerCreditTier: "A",
      payTerms: "Quick-pay 7 days · 1.5% fee",
      postedRelative: "12 minutes ago",
    },
    {
      id: "ln2",
      origin: { city: "Houston", state: "TX" },
      destination: { city: "Oklahoma City", state: "OK" },
      pickupDate: "May 12, 2026",
      equipment: "Reefer",
      weightLbs: 41000,
      miles: 451,
      rateUsd: 1875,
      ratePerMile: 4.16,
      brokerName: "RXO Logistics",
      brokerCreditDays: 30,
      brokerCreditTier: "A",
      payTerms: "Net-30 · ACH",
      postedRelative: "1 hour ago",
    },
    {
      id: "ln3",
      origin: { city: "Tulsa", state: "OK" },
      destination: { city: "Little Rock", state: "AR" },
      pickupDate: "May 13, 2026",
      equipment: "Dry van",
      weightLbs: 35000,
      miles: 268,
      rateUsd: 1100,
      ratePerMile: 4.10,
      brokerName: "Coyote Logistics",
      brokerCreditDays: 25,
      brokerCreditTier: "A",
      payTerms: "Quick-pay 2 days · 2.5% fee",
      postedRelative: "3 hours ago",
    },
    {
      id: "ln4",
      origin: { city: "Lubbock", state: "TX" },
      destination: { city: "Las Cruces", state: "NM" },
      pickupDate: "May 13, 2026",
      equipment: "Flatbed",
      weightLbs: 44000,
      miles: 327,
      rateUsd: 1450,
      ratePerMile: 4.43,
      brokerName: "Mode Transportation",
      brokerCreditDays: 28,
      brokerCreditTier: "B",
      payTerms: "Net-30",
      postedRelative: "5 hours ago",
    },
    {
      id: "ln5",
      origin: { city: "Shreveport", state: "LA" },
      destination: { city: "Fort Worth", state: "TX" },
      pickupDate: "May 14, 2026",
      equipment: "Dry van",
      weightLbs: 36000,
      miles: 221,
      rateUsd: 875,
      ratePerMile: 3.96,
      brokerName: "Cardinal Logistics",
      brokerCreditDays: 18,
      brokerCreditTier: "A",
      payTerms: "Quick-pay 3 days · 1.75% fee",
      postedRelative: "8 hours ago",
    },
    {
      id: "ln6",
      origin: { city: "Amarillo", state: "TX" },
      destination: { city: "Wichita", state: "KS" },
      pickupDate: "May 14, 2026",
      equipment: "Reefer",
      weightLbs: 39000,
      miles: 320,
      rateUsd: 1380,
      ratePerMile: 4.31,
      brokerName: "Total Quality Logistics",
      brokerCreditDays: 35,
      brokerCreditTier: "B",
      payTerms: "Net-35",
      postedRelative: "Yesterday",
    },
    {
      id: "ln7",
      origin: { city: "Baton Rouge", state: "LA" },
      destination: { city: "Memphis", state: "TN" },
      pickupDate: "May 15, 2026",
      equipment: "Dry van",
      weightLbs: 37000,
      miles: 405,
      rateUsd: 1620,
      ratePerMile: 4.00,
      brokerName: "ArcBest",
      brokerCreditDays: 20,
      brokerCreditTier: "A",
      payTerms: "Net-21",
      postedRelative: "Yesterday",
    },
    {
      id: "ln8",
      origin: { city: "Texarkana", state: "AR" },
      destination: { city: "Springfield", state: "MO" },
      pickupDate: "May 15, 2026",
      equipment: "Dry van",
      weightLbs: 34000,
      miles: 288,
      rateUsd: 1050,
      ratePerMile: 3.65,
      brokerName: "Worldwide Express",
      brokerCreditDays: 32,
      brokerCreditTier: "B",
      payTerms: "Net-30",
      postedRelative: "Yesterday",
    },
  ];

  const brokerCredit: BrokerCreditEntry[] = [
    { brokerName: "Echo Global Logistics", loadsThisYear: 14, avgPayDays: 21, tier: "A", notes: "Pays consistently. Quick-pay reliable." },
    { brokerName: "Coyote Logistics", loadsThisYear: 9, avgPayDays: 23, tier: "A", notes: "Quick-pay terms work as advertised." },
    { brokerName: "RXO Logistics", loadsThisYear: 8, avgPayDays: 28, tier: "A", notes: "Net-30 holds. Smooth ACH." },
    { brokerName: "Cardinal Logistics", loadsThisYear: 6, avgPayDays: 18, tier: "A", notes: "Best pay-on-time you've worked with." },
    { brokerName: "Mode Transportation", loadsThisYear: 4, avgPayDays: 31, tier: "B", notes: "Sometimes late by a week, no issues otherwise." },
    { brokerName: "Total Quality Logistics", loadsThisYear: 3, avgPayDays: 38, tier: "B", notes: "Pays late but pays. Avoid quick-pay through them." },
  ];

  const insuranceQuotes: InsuranceQuote[] = [
    {
      id: "iq1",
      brokerName: "Brookhaven Commercial",
      status: "received",
      bipdLimit: "$1,000,000",
      cargoLimit: "$100,000",
      premiumUsd: 14240,
      deductibleUsd: 2500,
      effectiveStart: "Aug 1, 2026",
      notes: "Quote includes hazmat rider option (+$1,200/yr).",
      receivedAt: "Yesterday",
    },
    {
      id: "iq2",
      brokerName: "Lone Star Specialty Insurance",
      status: "received",
      bipdLimit: "$1,000,000",
      cargoLimit: "$100,000",
      premiumUsd: 13890,
      deductibleUsd: 5000,
      effectiveStart: "Aug 1, 2026",
      notes: "Higher deductible, lower premium. Same coverage limits.",
      receivedAt: "2 days ago",
    },
    {
      id: "iq3",
      brokerName: "Heritage Trucking Insurance",
      status: "pending",
      bipdLimit: "—",
      cargoLimit: "—",
      premiumUsd: 0,
      deductibleUsd: 0,
      effectiveStart: "Aug 1, 2026",
      notes: "Loss runs received, underwriter reviewing. ETA 3 days.",
    },
  ];

  const financingQuotes: FinancingQuote[] = [
    {
      id: "fq1",
      factorName: "RTS Financial",
      factorSlug: "rts-financial",
      type: "factoring",
      status: "available",
      rate: "2.5% on invoices > $10K",
      fundingSpeed: "Same-day",
      recourseLabel: "Non-recourse",
      monthlyMinimum: "$50K monthly volume",
      notes: "Includes free fuel-advance program up to 40% on covered loads.",
      receivedAt: "6 days ago",
    },
    {
      id: "fq2",
      factorName: "TBS Factoring",
      factorSlug: "tbs-factoring",
      type: "factoring",
      status: "available",
      rate: "2.9% flat",
      fundingSpeed: "Same-day",
      recourseLabel: "Recourse",
      monthlyMinimum: "$20K monthly volume",
      notes: "No long-term contract. Month-to-month.",
      receivedAt: "4 days ago",
    },
    {
      id: "fq3",
      factorName: "Apex Capital",
      factorSlug: "apex-capital",
      type: "factoring",
      status: "pending",
      rate: "—",
      fundingSpeed: "—",
      recourseLabel: "—",
      notes: "Underwriting in progress. ETA 2 days.",
    },
    {
      id: "fq4",
      factorName: "BlueVine Trucking",
      factorSlug: "bluevine-trucking",
      type: "working-capital",
      status: "available",
      rate: "Prime + 4.5%",
      fundingSpeed: "48 hours",
      recourseLabel: "Personal guarantee",
      monthlyMinimum: "$100K line",
      notes: "$100K revolving line. Useful for fuel + payroll bridge.",
      receivedAt: "Yesterday",
    },
  ];

  const fuelPrograms: FuelProgram[] = [
    {
      id: "fp1",
      programName: "TA / Petro RoadKing",
      network: "TA, Petro · 1,300+ locations",
      perGallonOff: 0.42,
      monthlyMinimumGallons: 0,
      driverControls: true,
      fraudControls: true,
      rebatePercent: 0,
      estAnnualSavings: 18900,
    },
    {
      id: "fp2",
      programName: "Loves Fleet Card",
      network: "Loves · 580+ locations",
      perGallonOff: 0.38,
      monthlyMinimumGallons: 0,
      driverControls: true,
      fraudControls: true,
      rebatePercent: 1.5,
      estAnnualSavings: 17100,
    },
    {
      id: "fp3",
      programName: "Pilot Flying J Drivers Club Pro",
      network: "Pilot Flying J · 750+ locations",
      perGallonOff: 0.35,
      monthlyMinimumGallons: 1500,
      driverControls: true,
      fraudControls: true,
      rebatePercent: 2.0,
      estAnnualSavings: 15750,
    },
    {
      id: "fp4",
      programName: "EFS Fleet One",
      network: "Universal · 8,000+ locations incl. independents",
      perGallonOff: 0.28,
      monthlyMinimumGallons: 0,
      driverControls: true,
      fraudControls: true,
      rebatePercent: 1.0,
      estAnnualSavings: 12600,
    },
  ];

  const equipmentOffers: EquipmentOffer[] = [
    {
      id: "eq1",
      lenderName: "Mitsubishi HC Capital",
      type: "purchase",
      amountUsd: 165000,
      termMonths: 60,
      apr: 8.95,
      prepaymentPenalty: false,
      softPullStage: true,
      notes: "Soft pull only at this stage. Hard pull triggered after term-sheet acceptance.",
    },
    {
      id: "eq2",
      lenderName: "Commercial Fleet Financing",
      type: "purchase",
      amountUsd: 165000,
      termMonths: 72,
      apr: 9.45,
      prepaymentPenalty: false,
      softPullStage: true,
      notes: "Longer term, slightly higher APR. Lower monthly payment ($2,860 vs $3,420).",
    },
    {
      id: "eq3",
      lenderName: "Triumph Business Capital",
      type: "lease-to-own",
      amountUsd: 165000,
      termMonths: 60,
      apr: 9.75,
      prepaymentPenalty: false,
      softPullStage: true,
      notes: "$1 buyout at end of term. Treated as operating lease for tax purposes.",
    },
    {
      id: "eq4",
      lenderName: "Crestmark / Pathward",
      type: "refinance",
      amountUsd: 78400,
      termMonths: 48,
      apr: 7.85,
      prepaymentPenalty: false,
      softPullStage: true,
      notes: "Refinance offer for PU-05 (currently at 11.20% APR with Volvo Captive).",
    },
  ];

  return {
    lanes,
    brokerCredit,
    insurance: {
      activeQuotes: insuranceQuotes,
      lastQuoteRequestedAt: "May 3, 2026",
    },
    financing: {
      currentFactor: null,
      activeQuotes: financingQuotes,
    },
    fuel: {
      currentProgram: null,
      availablePrograms: fuelPrograms,
    },
    equipment: {
      availableOffers: equipmentOffers,
      currentNotes: [
        {
          lender: "Volvo Captive Finance",
          balanceUsd: 78400,
          apr: 11.20,
          termsRemainingMonths: 36,
          unitNumber: "PU-05",
        },
      ],
    },
  };
}
