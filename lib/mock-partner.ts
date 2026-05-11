export type PartnerVertical =
  | "insurance"
  | "factoring"
  | "freight"
  | "fuel-and-cards"
  | "equipment"
  | "compliance";

export type DeliveryStatus = "on_track" | "slightly_behind" | "behind" | "ahead";

export type TransferDisposition =
  | "new"
  | "contacted"
  | "quoted"
  | "won"
  | "lost"
  | "rejected";

export type PartnerProfile = {
  slug: string;
  legalName: string;
  shortName: string;
  vertical: PartnerVertical;
  verticalLabel: string;
  founding: boolean;
  cohort: number;
  status: "active" | "paused" | "renewal_pending";
  refreshedAt: string;
};

export type Agreement = {
  signed: string;
  windowDays: number;
  daysElapsed: number;
  daysRemaining: number;
  endsOn: string;
  slaRefundOrRolloverAfter: string;
  transferTarget: number;
  transfersDelivered: number;
  pricePerTransferUsd: number;
  totalCommittedUsd: number;
};

export type LockedSpec = {
  composedAt: string;
  audienceSizeAtCompose: number;
  audienceSizeNow: number;
  audienceDriftNet: number;
  criteria: { label: string; value: string }[];
};

export type AudienceDriftEvent = {
  id: string;
  label: string;
  delta: number;
  reason: string;
};

export type DispositionBreakdown = {
  new: number;
  contacted: number;
  quoted: number;
  won: number;
  lost: number;
};

export type ActivityEvent = {
  id: string;
  timestamp: string;
  relativeTime: string;
  category: "transfer" | "milestone" | "drift" | "disposition";
  title: string;
  body: string;
};

export type TransferRow = {
  id: string;
  receivedAt: string;
  relativeTime: string;
  carrier: {
    legalName: string;
    dba?: string;
    dotNumber: string;
    domicile: string;
    powerUnits: number;
    drivers: number;
    equipmentClass: string;
    hazmat: boolean;
  };
  matchCriteria: string[];
  signals: { label: string; value: string }[];
  contact: { name: string; phone: string; email: string };
  disposition: TransferDisposition;
};

export type TeamRole = "admin" | "disposer" | "viewer";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  lastActive: string;
  dispositionsLogged: number;
};

export type Invoice = {
  id: string;
  number: string;
  date: string;
  amountUsd: number;
  status: "paid" | "due" | "draft";
  description: string;
};

export type WeeklyDelivery = {
  weekLabel: string;
  delivered: number;
  paceTarget: number;
};

export type AudienceCarrierRow = {
  legalName: string;
  dotNumber: string;
  domicile: string;
  powerUnits: number;
  equipmentClass: string;
  authorityYears: number;
  hazmat: boolean;
  status: "in_pool" | "transferred" | "out";
};

export type AudienceFacet = {
  label: string;
  count: number;
};

export type AudienceStats = {
  byEquipment: AudienceFacet[];
  byState: AudienceFacet[];
  byFleetSize: AudienceFacet[];
  byAuthorityAge: AudienceFacet[];
};

export type WinRatePoint = {
  weekLabel: string;
  winRatePct: number;
};

export type PartnerDashboardData = {
  partner: PartnerProfile;
  agreement: Agreement;
  spec: LockedSpec;
  dispositions: DispositionBreakdown;
  awaitingAction: number;
  deliveryStatus: DeliveryStatus;
  projectedFinalDelivery: number;
  driftBreakdown: AudienceDriftEvent[];
  activity: ActivityEvent[];
  transfers: TransferRow[];
  team: TeamMember[];
  invoices: Invoice[];
  weeklyDeliveries: WeeklyDelivery[];
  winRateTrend: WinRatePoint[];
  audiencePreview: AudienceCarrierRow[];
  audienceStats: AudienceStats;
};

const PARTNERS: Record<string, PartnerDashboardData> = {
  brookhaven: buildBrookhaven(),
};

export function getMockPartner(slug: string): PartnerDashboardData {
  const key = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return PARTNERS[key] ?? PARTNERS.brookhaven;
}

function buildBrookhaven(): PartnerDashboardData {
  const partner: PartnerProfile = {
    slug: "brookhaven",
    legalName: "Brookhaven Commercial Insurance Services, LLC",
    shortName: "Brookhaven Commercial",
    vertical: "insurance",
    verticalLabel: "Trucking Insurance",
    founding: true,
    cohort: 1,
    status: "active",
    refreshedAt: "12 minutes ago",
  };

  const agreement: Agreement = {
    signed: "Mar 4, 2026",
    windowDays: 90,
    daysElapsed: 68,
    daysRemaining: 22,
    endsOn: "Jun 2, 2026",
    slaRefundOrRolloverAfter: "Jun 2, 2026",
    transferTarget: 80,
    transfersDelivered: 51,
    pricePerTransferUsd: 562,
    totalCommittedUsd: 45000,
  };

  const spec: LockedSpec = {
    composedAt: "Mar 4, 2026 · 2:18pm CT",
    audienceSizeAtCompose: 6800,
    audienceSizeNow: 6943,
    audienceDriftNet: 143,
    criteria: [
      { label: "Geography", value: "TX · OK · NM · AR · LA" },
      { label: "Fleet size", value: "5 – 25 power units" },
      { label: "Operating class", value: "Interstate · General freight" },
      { label: "Equipment", value: "Dry van · Reefer · Flatbed" },
      { label: "MCS-150 freshness", value: "Refreshed within 18 months" },
      { label: "Loss profile", value: "≤ 1 OOS crash in last 24 months" },
      { label: "Authority age", value: "≥ 2 years" },
      { label: "Hazmat", value: "Endorsed or not (any)" },
    ],
  };

  // Their pipeline state across all 51 delivered transfers.
  const dispositions: DispositionBreakdown = {
    new: 4,
    contacted: 12,
    quoted: 8,
    won: 19,
    lost: 8,
  };

  const awaitingAction = dispositions.new + dispositions.contacted;

  const driftBreakdown: AudienceDriftEvent[] = [
    { id: "d1", label: "New authorities granted", delta: 87, reason: "FMCSA grants since spec lock" },
    { id: "d2", label: "Fleet expansions into range", delta: 64, reason: "Carriers crossed into 5-PU floor" },
    { id: "d3", label: "Out-of-bounds drift", delta: -8, reason: "Authorities revoked or fleet contraction" },
  ];

  // Activity reflects the partner's view: transfers, audience supply changes,
  // delivery milestones, dispositions their team logged. Nothing about how
  // the platform sources the transfers — that's not their concern.
  const activity: ActivityEvent[] = [
    {
      id: "a1",
      timestamp: "2026-05-11T13:42:00Z",
      relativeTime: "Today · 8:42am CT",
      category: "transfer",
      title: "New transfer: Frontier Logistics LLC",
      body: "TX general freight, 14 power units, 5y authority, 0 OOS crashes. Insurance expires in 82 days.",
    },
    {
      id: "a2",
      timestamp: "2026-05-11T11:05:00Z",
      relativeTime: "Today · 6:05am CT",
      category: "disposition",
      title: "Pelican State Freight Co. marked Quoted",
      body: "Quote sent by Marcus on your team. Carrier requested $1M BIPD with cargo rider.",
    },
    {
      id: "a3",
      timestamp: "2026-05-10T20:00:00Z",
      relativeTime: "Yesterday · 3:00pm CT",
      category: "milestone",
      title: "Transfer 51 of 80 delivered — 64% of target",
      body: "22 days remaining in your delivery window. At current pace the projection is 67 transfers by Jun 2.",
    },
    {
      id: "a4",
      timestamp: "2026-05-10T15:20:00Z",
      relativeTime: "Yesterday · 10:20am CT",
      category: "drift",
      title: "+23 carriers entered your locked audience this week",
      body: "Net audience grew from new authorities granted in TX/OK and fleet expansions across LA/AR, offset by 2 carriers crossing out of bounds.",
    },
    {
      id: "a5",
      timestamp: "2026-05-09T13:15:00Z",
      relativeTime: "2 days ago",
      category: "transfer",
      title: "New transfer: Mesilla Valley Express LLC",
      body: "NM reefer, 6 power units, 3y authority. Carrier requested quotes through their dashboard.",
    },
    {
      id: "a6",
      timestamp: "2026-05-08T17:30:00Z",
      relativeTime: "3 days ago",
      category: "disposition",
      title: "High Plains Transport won",
      body: "Wesley on your team logged a closed-won. Premium $14,240 annual. Hazmat endorsement, 7 PUs.",
    },
    {
      id: "a7",
      timestamp: "2026-05-03T16:00:00Z",
      relativeTime: "8 days ago",
      category: "milestone",
      title: "Halfway mark hit: 40 of 80 transferred",
      body: "Reached 50% delivery on day 58 of 90. Projection at that point: 75 of 80 by window close.",
    },
    {
      id: "a8",
      timestamp: "2026-05-01T10:00:00Z",
      relativeTime: "10 days ago",
      category: "drift",
      title: "Net +47 carriers in your audience this month",
      body: "Cumulative drift since spec lock: 6,800 → 6,943 (+143). Most growth from new authorities in your TX/OK geographies.",
    },
  ];

  const transfers: TransferRow[] = [
    {
      id: "t1",
      receivedAt: "2026-05-11T13:42:00Z",
      relativeTime: "12 minutes ago",
      carrier: {
        legalName: "Frontier Logistics LLC",
        dba: "Frontier Freight",
        dotNumber: "3417829",
        domicile: "Dallas, TX",
        powerUnits: 14,
        drivers: 18,
        equipmentClass: "Dry van",
        hazmat: false,
      },
      matchCriteria: [
        "TX domicile · runs TX-OK-AR-LA lanes",
        "14 power units (in 5-25 range)",
        "Authority granted 2021 (5y old)",
        "MCS-150 refreshed 43 days ago",
        "0 OOS crashes (24mo) · 11 clean inspections",
      ],
      signals: [
        { label: "Insurance expires", value: "82 days" },
        { label: "Recent fleet add", value: "+3 PUs Q1" },
        { label: "Last inspection", value: "Apr 28 · clean" },
      ],
      contact: {
        name: "Carla Whitfield",
        phone: "(214) 555-0142",
        email: "carla@frontierfreight.com",
      },
      disposition: "new",
    },
    {
      id: "t2",
      receivedAt: "2026-05-11T08:14:00Z",
      relativeTime: "5 hours ago",
      carrier: {
        legalName: "Sundown Carriers Inc",
        dotNumber: "2891034",
        domicile: "Lubbock, TX",
        powerUnits: 9,
        drivers: 11,
        equipmentClass: "Flatbed",
        hazmat: false,
      },
      matchCriteria: [
        "TX domicile · TX-NM-OK lanes",
        "9 power units flatbed (5-25 range, matches building-materials freight)",
        "Authority granted 2017 (8y old)",
        "MCS-150 refreshed 6 months ago",
      ],
      signals: [
        { label: "Insurance expires", value: "144 days" },
        { label: "Quoted by", value: "1 broker last cycle" },
        { label: "Loss runs uploaded", value: "Yes" },
      ],
      contact: {
        name: "Travis Mendoza",
        phone: "(806) 555-0178",
        email: "travis@sundowncarriers.com",
      },
      disposition: "contacted",
    },
    {
      id: "t3",
      receivedAt: "2026-05-10T19:50:00Z",
      relativeTime: "Yesterday",
      carrier: {
        legalName: "Pelican State Freight Co.",
        dotNumber: "3120458",
        domicile: "Baton Rouge, LA",
        powerUnits: 22,
        drivers: 27,
        equipmentClass: "Reefer",
        hazmat: false,
      },
      matchCriteria: [
        "LA domicile · runs LA-TX-MS-AL refrigerated",
        "22 power units (top of 5-25 range)",
        "Authority granted 2014 (11y old)",
        "0 OOS crashes (24mo) · 16 clean inspections",
      ],
      signals: [
        { label: "Insurance expires", value: "37 days" },
        { label: "Recent fleet add", value: "+4 PUs YTD" },
        { label: "Carrier requested", value: "Quotes via dashboard" },
      ],
      contact: {
        name: "Ann Marie Boudreaux",
        phone: "(225) 555-0193",
        email: "amb@pelicanstatefreight.com",
      },
      disposition: "quoted",
    },
    {
      id: "t4",
      receivedAt: "2026-05-09T11:20:00Z",
      relativeTime: "2 days ago",
      carrier: {
        legalName: "High Plains Transport LLC",
        dotNumber: "2950172",
        domicile: "Amarillo, TX",
        powerUnits: 7,
        drivers: 9,
        equipmentClass: "Dry van",
        hazmat: false,
      },
      matchCriteria: [
        "TX panhandle · runs TX-OK-CO-KS",
        "7 power units (in 5-25 range)",
        "Authority granted 2019 (6y old)",
        "Hazmat endorsement added Q1 2026",
      ],
      signals: [
        { label: "Insurance expires", value: "12 days" },
        { label: "Hazmat endorsement", value: "New Q1 2026" },
        { label: "Last inspection", value: "Mar 14 · 1 viol." },
      ],
      contact: {
        name: "Wesley Tran",
        phone: "(806) 555-0211",
        email: "wesley@highplainstransport.com",
      },
      disposition: "won",
    },
    {
      id: "t5",
      receivedAt: "2026-05-08T09:33:00Z",
      relativeTime: "3 days ago",
      carrier: {
        legalName: "Red River Hauling Inc",
        dotNumber: "3208441",
        domicile: "Texarkana, AR",
        powerUnits: 11,
        drivers: 13,
        equipmentClass: "Dry van",
        hazmat: false,
      },
      matchCriteria: [
        "AR domicile · runs AR-TX-LA-OK",
        "11 power units (in 5-25 range)",
        "Authority granted 2020 (5y old)",
        "Clean loss runs",
      ],
      signals: [
        { label: "Insurance expires", value: "201 days" },
        { label: "Status", value: "Renewed elsewhere" },
        { label: "Lost reason", value: "Existing relationship" },
      ],
      contact: {
        name: "Janelle Carter",
        phone: "(870) 555-0156",
        email: "jcarter@redriverhauling.com",
      },
      disposition: "lost",
    },
    {
      id: "t6",
      receivedAt: "2026-05-08T16:14:00Z",
      relativeTime: "3 days ago",
      carrier: {
        legalName: "Mesilla Valley Express LLC",
        dotNumber: "2873920",
        domicile: "Las Cruces, NM",
        powerUnits: 6,
        drivers: 8,
        equipmentClass: "Reefer",
        hazmat: false,
      },
      matchCriteria: [
        "NM domicile · runs NM-TX-AZ refrigerated",
        "6 power units (in 5-25 range)",
        "Authority granted 2022 (3y old)",
        "Produce season + I-10 lane match",
      ],
      signals: [
        { label: "Insurance expires", value: "67 days" },
        { label: "Recent fleet add", value: "+1 reefer Q2" },
        { label: "Carrier requested", value: "Quotes via dashboard" },
      ],
      contact: {
        name: "Adriana Solis",
        phone: "(575) 555-0124",
        email: "adriana@mesillavalleyexpress.com",
      },
      disposition: "new",
    },
    {
      id: "t7",
      receivedAt: "2026-05-07T13:45:00Z",
      relativeTime: "4 days ago",
      carrier: {
        legalName: "Tulsa Bend Trucking Co",
        dotNumber: "3056118",
        domicile: "Tulsa, OK",
        powerUnits: 18,
        drivers: 21,
        equipmentClass: "Flatbed",
        hazmat: true,
      },
      matchCriteria: [
        "OK domicile · runs OK-TX-AR-KS-MO",
        "18 power units (in 5-25 range)",
        "Authority granted 2013 (12y old)",
        "Hazmat endorsement (matches your spec inclusion)",
        "0 OOS crashes (24mo)",
      ],
      signals: [
        { label: "Insurance expires", value: "94 days" },
        { label: "Hazmat", value: "Endorsed" },
        { label: "Last inspection", value: "Apr 19 · clean" },
      ],
      contact: {
        name: "Marcus Holloway",
        phone: "(918) 555-0187",
        email: "marcus@tulsabendtrucking.com",
      },
      disposition: "quoted",
    },
    {
      id: "t8",
      receivedAt: "2026-05-05T10:08:00Z",
      relativeTime: "6 days ago",
      carrier: {
        legalName: "Ozark Crossing Logistics LLC",
        dotNumber: "3289047",
        domicile: "Fayetteville, AR",
        powerUnits: 8,
        drivers: 10,
        equipmentClass: "Dry van",
        hazmat: false,
      },
      matchCriteria: [
        "AR domicile · runs AR-OK-MO-KS",
        "8 power units (in 5-25 range)",
        "Authority granted 2021 (4y old)",
        "Clean inspection record",
      ],
      signals: [
        { label: "Insurance expires", value: "153 days" },
        { label: "Recent fleet add", value: "+2 PUs Q1" },
        { label: "Last inspection", value: "Apr 4 · clean" },
      ],
      contact: {
        name: "Becky Lindholm",
        phone: "(479) 555-0162",
        email: "becky@ozarkcrossinglogistics.com",
      },
      disposition: "contacted",
    },
  ];

  const pace =
    (agreement.transfersDelivered / agreement.daysElapsed) * agreement.windowDays;
  const projectedFinalDelivery = Math.round(pace);
  const deliveryStatus: DeliveryStatus =
    projectedFinalDelivery >= agreement.transferTarget
      ? "on_track"
      : projectedFinalDelivery >= agreement.transferTarget - 5
        ? "slightly_behind"
        : "behind";

  const team: TeamMember[] = [
    { id: "tm1", name: "Marcus Holloway", email: "marcus@brookhaven-ci.com", role: "admin", lastActive: "Today · 8:14am", dispositionsLogged: 24 },
    { id: "tm2", name: "Wesley Tran", email: "wesley@brookhaven-ci.com", role: "disposer", lastActive: "Today · 7:46am", dispositionsLogged: 19 },
    { id: "tm3", name: "Carla Whitfield", email: "carla@brookhaven-ci.com", role: "disposer", lastActive: "Yesterday · 4:22pm", dispositionsLogged: 8 },
    { id: "tm4", name: "Janelle Carter", email: "janelle@brookhaven-ci.com", role: "viewer", lastActive: "4 days ago", dispositionsLogged: 0 },
  ];

  const invoices: Invoice[] = [
    { id: "inv-1", number: "BC-2026-0042", date: "Mar 4, 2026", amountUsd: 45000, status: "paid", description: "Founding-partner pre-paid commitment · 80 transfers · 90-day window" },
  ];

  const weeklyDeliveries: WeeklyDelivery[] = [
    { weekLabel: "Mar 1-7",   delivered: 1,  paceTarget: 6 },
    { weekLabel: "Mar 8-14",  delivered: 4,  paceTarget: 6 },
    { weekLabel: "Mar 15-21", delivered: 5,  paceTarget: 6 },
    { weekLabel: "Mar 22-28", delivered: 6,  paceTarget: 6 },
    { weekLabel: "Mar 29-Apr 4", delivered: 7,  paceTarget: 6 },
    { weekLabel: "Apr 5-11",  delivered: 8,  paceTarget: 6 },
    { weekLabel: "Apr 12-18", delivered: 6,  paceTarget: 6 },
    { weekLabel: "Apr 19-25", delivered: 7,  paceTarget: 6 },
    { weekLabel: "Apr 26-May 2", delivered: 5,  paceTarget: 6 },
    { weekLabel: "May 3-9",   delivered: 7,  paceTarget: 6 },
    { weekLabel: "May 10-16 (so far)", delivered: 2, paceTarget: 6 },
  ];

  const winRateTrend: WinRatePoint[] = [
    { weekLabel: "Mar 1-7",   winRatePct: 0 },
    { weekLabel: "Mar 8-14",  winRatePct: 50 },
    { weekLabel: "Mar 15-21", winRatePct: 60 },
    { weekLabel: "Mar 22-28", winRatePct: 67 },
    { weekLabel: "Mar 29-Apr 4", winRatePct: 71 },
    { weekLabel: "Apr 5-11",  winRatePct: 69 },
    { weekLabel: "Apr 12-18", winRatePct: 73 },
    { weekLabel: "Apr 19-25", winRatePct: 70 },
    { weekLabel: "Apr 26-May 2", winRatePct: 72 },
    { weekLabel: "May 3-9",   winRatePct: 70 },
  ];

  const audiencePreview: AudienceCarrierRow[] = [
    { legalName: "Cypress Bayou Transport Inc", dotNumber: "3104278", domicile: "Lafayette, LA", powerUnits: 12, equipmentClass: "Dry van", authorityYears: 6, hazmat: false, status: "in_pool" },
    { legalName: "Llano Estacado Carriers", dotNumber: "2987142", domicile: "Plainview, TX", powerUnits: 18, equipmentClass: "Flatbed", authorityYears: 9, hazmat: false, status: "in_pool" },
    { legalName: "Frontier Logistics LLC", dotNumber: "3417829", domicile: "Dallas, TX", powerUnits: 14, equipmentClass: "Dry van", authorityYears: 5, hazmat: false, status: "transferred" },
    { legalName: "Big Bend Freight Co", dotNumber: "3019384", domicile: "Alpine, TX", powerUnits: 7, equipmentClass: "Reefer", authorityYears: 4, hazmat: false, status: "in_pool" },
    { legalName: "Sundown Carriers Inc", dotNumber: "2891034", domicile: "Lubbock, TX", powerUnits: 9, equipmentClass: "Flatbed", authorityYears: 8, hazmat: false, status: "transferred" },
    { legalName: "Tulsa Bend Trucking Co", dotNumber: "3056118", domicile: "Tulsa, OK", powerUnits: 18, equipmentClass: "Flatbed", authorityYears: 12, hazmat: true, status: "transferred" },
    { legalName: "Caddo Lake Logistics", dotNumber: "3201874", domicile: "Shreveport, LA", powerUnits: 11, equipmentClass: "Dry van", authorityYears: 7, hazmat: false, status: "in_pool" },
    { legalName: "Pecos Valley Express", dotNumber: "2902481", domicile: "Roswell, NM", powerUnits: 8, equipmentClass: "Reefer", authorityYears: 5, hazmat: false, status: "in_pool" },
    { legalName: "Acme Carrier LLC", dotNumber: "1234567", domicile: "Dallas, TX", powerUnits: 8, equipmentClass: "Dry van", authorityYears: 7, hazmat: false, status: "in_pool" },
    { legalName: "Ozark Crossing Logistics LLC", dotNumber: "3289047", domicile: "Fayetteville, AR", powerUnits: 8, equipmentClass: "Dry van", authorityYears: 4, hazmat: false, status: "transferred" },
    { legalName: "Permian Basin Hauling Inc", dotNumber: "3094218", domicile: "Midland, TX", powerUnits: 21, equipmentClass: "Flatbed", authorityYears: 10, hazmat: true, status: "in_pool" },
    { legalName: "Red River Hauling Inc", dotNumber: "3208441", domicile: "Texarkana, AR", powerUnits: 11, equipmentClass: "Dry van", authorityYears: 5, hazmat: false, status: "out" },
  ];

  const audienceStats: AudienceStats = {
    byEquipment: [
      { label: "Dry van", count: 3210 },
      { label: "Flatbed", count: 1980 },
      { label: "Reefer", count: 1420 },
      { label: "Tanker", count: 213 },
      { label: "Other", count: 120 },
    ],
    byState: [
      { label: "TX", count: 3104 },
      { label: "OK", count: 1248 },
      { label: "LA", count: 980 },
      { label: "AR", count: 870 },
      { label: "NM", count: 741 },
    ],
    byFleetSize: [
      { label: "5-7 PU", count: 1942 },
      { label: "8-12 PU", count: 2218 },
      { label: "13-18 PU", count: 1654 },
      { label: "19-25 PU", count: 1129 },
    ],
    byAuthorityAge: [
      { label: "2-3 years", count: 894 },
      { label: "4-6 years", count: 1820 },
      { label: "7-10 years", count: 2447 },
      { label: "10+ years", count: 1782 },
    ],
  };

  return {
    partner,
    agreement,
    spec,
    dispositions,
    awaitingAction,
    deliveryStatus,
    projectedFinalDelivery,
    driftBreakdown,
    activity,
    transfers,
    team,
    invoices,
    weeklyDeliveries,
    winRateTrend,
    audiencePreview,
    audienceStats,
  };
}
