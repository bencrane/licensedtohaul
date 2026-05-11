export type CategorySlug =
  | "freight"
  | "insurance"
  | "financing"
  | "fuel-and-cards"
  | "equipment"
  | "compliance";

export type Category = {
  slug: CategorySlug;
  title: string;
  shortName: string;
  headline: string;
  blurb: string;
  whatYouGet: string[];
  goodIf: string[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "freight",
    title: "Freight",
    shortName: "Freight",
    headline: "Direct lanes from operators that fit your authority.",
    blurb:
      "Lane opportunities matched against your authority's lane history, equipment class, and credit appetite. Pay terms and broker credit are visible before you cover the load.",
    whatYouGet: [
      "Direct lanes matched to your equipment and operating geography",
      "Broker credit and pay terms visible before booking",
      "Quick-pay options surfaced where the broker offers them",
      "Lane history feeds the match — what you ran shapes what shows up",
    ],
    goodIf: [
      "You run consistent lanes and want to see freight that fits them",
      "You have an MC and want a short list of brokers worth working with",
      "You'd like to see broker pay terms up front",
    ],
  },
  {
    slug: "insurance",
    title: "Insurance",
    shortName: "Insurance",
    headline: "Quotes from brokers that write carriers in your operating class.",
    blurb:
      "Primary auto liability, physical damage, cargo, and non-trucking liability. Quote requests are routed to independent brokers and wholesale shops that write carriers in your operating class, geography, and loss profile.",
    whatYouGet: [
      "Two-to-four real quotes against your USDOT and operating profile",
      "Brokers that specialize in your operating class (general freight, hazmat, refrigerated, flatbed, tanker)",
      "Premium, deductible, and coverage breakdowns side by side",
      "Loss runs uploaded once and used across every quote",
    ],
    goodIf: [
      "Your renewal is up in the next 90 days",
      "You added equipment, added a hazmat endorsement, or changed your operating class",
      "Your current premium climbed and your loss runs haven't",
    ],
  },
  {
    slug: "financing",
    title: "Financing",
    shortName: "Financing",
    headline: "Get paid faster. Bridge the cash flow.",
    blurb:
      "Invoice factoring, fuel advances, and working-capital lines matched to your customer mix and daily invoice volume. Same-day funding on most factored invoices.",
    whatYouGet: [
      "Same-day funding on most invoices",
      "Factoring rates priced to your invoice volume",
      "Fuel-advance + factoring combined where it pencils",
      "Working-capital lines for bridge financing between settlements",
      "Customer credit checks before you cover for a new broker",
    ],
    goodIf: [
      "You're running 7-30 day pay terms and want the gap closed",
      "Your current factor's spread is creeping up at renewal",
      "You need fuel cash on Monday for a load that delivers Friday",
    ],
  },
  {
    slug: "fuel-and-cards",
    title: "Fuel Cards",
    shortName: "Fuel Cards",
    headline: "Per-gallon discounts on the routes you run.",
    blurb:
      "Fuel-discount programs and fleet cards across TA, Petro, Loves, Pilot, and independents. Card-level driver controls, real-time reporting, plus tire and maintenance programs.",
    whatYouGet: [
      "Per-gallon cents-off at TA, Petro, Loves, Pilot, and independents",
      "Tire programs, maintenance discounts, lodging where it applies",
      "Real-time card-level reporting and driver controls",
      "Programs that approve fleets of 3 to 25 power units",
    ],
    goodIf: [
      "Your current fuel program's savings stopped being interesting",
      "You're running 3-25 power units and want a program priced for your scale",
      "You want fraud controls and driver-level limits",
    ],
  },
  {
    slug: "equipment",
    title: "Equipment",
    shortName: "Equipment",
    headline: "Financing for the next tractor or trailer.",
    blurb:
      "Tractor and trailer financing, lease-to-own programs, and refinance options on existing notes — from lenders that approve small fleets and owner-operators.",
    whatYouGet: [
      "Soft pulls on initial qualification (hard pulls only after you accept a term sheet)",
      "Lenders that approve small fleets and owner-operators",
      "Trade-in valuations and refinance comparisons",
      "Term sheets that show prepayment, accrual, and rate-step schedules before signing",
    ],
    goodIf: [
      "You're adding a power unit and want options outside the dealer's captive finance",
      "You're sitting on a high-rate equipment note from 2024",
      "You're trading in and want a non-dealer view of what your unit is worth",
    ],
  },
  {
    slug: "compliance",
    title: "Compliance",
    shortName: "Compliance",
    headline: "Filing deadlines tracked against your authority.",
    blurb:
      "MCS-150 refresh reminders, IFTA quarterly filings, IRP renewal tracking, drug & alcohol consortium enrollment, BOC-3, and biennial filings — all pegged to your authority's actual filing cadence.",
    whatYouGet: [
      "MCS-150 refresh reminders ahead of the next audit cycle",
      "IFTA quarterly filing support",
      "IRP renewal tracking by jurisdiction",
      "Drug & alcohol program enrollment and consortium management",
      "BOC-3 and biennial filings handled",
    ],
    goodIf: [
      "Your MCS-150 hasn't been refreshed in the last 18 months",
      "You're a new authority and want a single place to see what's due when",
      "You'd like filing deadlines in your calendar before they hit your status",
    ],
  },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function fmcsaStats() {
  return {
    activeCarriers: "2.59M",
    activeCarriersFull: "2,590,000",
    trackedWeekly: "847K",
    newAuthoritiesMonth: "18,400",
    fleetGrowthYoY: "+12%",
  };
}
