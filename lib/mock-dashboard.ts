export type AuthorityStatus = "active" | "pending" | "out_of_service";
export type HealthStatus = "good" | "warn" | "alert";

export type CarrierProfile = {
  dotNumber: string;
  mcNumber: string;
  legalName: string;
  dba?: string;
  status: AuthorityStatus;
  authorityTypes: string[];
  carrierOperation: string;
  authorityGranted: string;
  authorityAge: { years: number; months: number };
  powerUnits: number;
  drivers: number;
  domicileState: string;
  operatingStates: string[];
  cargoCarried: string[];
  hazmatEndorsed: boolean;
  refreshedAt: string;
  legalAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone: string;
  emailOnFile: string;
};

export type Mcs150 = {
  filedAt: string;
  daysSinceFiled: number;
  nextDueIn: number;
  status: HealthStatus;
};

export type InsuranceOnFile = {
  bipdLimit: string;
  cargoLimit: string;
  insurer: string;
  effective: string;
  expires: string;
  daysToExpiration: number;
  status: HealthStatus;
  policyNumber: string;
  agent: { name: string; phone: string };
  history: {
    type: string;
    insurer: string;
    effective: string;
    expired: string;
  }[];
};

export type CsaBasic = {
  name: string;
  percentile: number;
  status: HealthStatus;
  trend: "up" | "down" | "flat";
  trendDelta: number;
};

export type Crash = {
  id: string;
  date: string;
  state: string;
  location: string;
  severity: "fatal" | "injury" | "tow-away";
  ooss: boolean;
  reportNumber: string;
  hazmat: boolean;
};

export type Inspection = {
  id: string;
  date: string;
  state: string;
  location: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  type: "vehicle" | "driver" | "vehicle+driver";
  vehicleViolations: number;
  driverViolations: number;
  ooss: boolean;
  unitNumber?: string;
  driverName?: string;
};

export type SafetySnapshot = {
  crashes24mo: number;
  crashesOutOfService: number;
  inspectionsVehicle24mo: number;
  inspectionsDriver24mo: number;
  vehicleOosRate: number;
  driverOosRate: number;
  basics: CsaBasic[];
  crashList: Crash[];
  inspectionList: Inspection[];
  lastAudit: { date: string; result: string } | null;
};

export type PowerUnit = {
  id: string;
  unitNumber: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  plateNumber: string;
  plateState: string;
  equipmentClass: string;
  inService: boolean;
  inspections24mo: number;
  oosCount: number;
};

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  cdlState: string;
  cdlClass: "A" | "B" | "C";
  hireDate: string;
  hazmatEndorsed: boolean;
  mvrLastPulled: string;
  inspections24mo: number;
};

export type FleetSnapshot = {
  powerUnitsNow: number;
  powerUnits90dAgo: number;
  driversNow: number;
  drivers90dAgo: number;
  inspectionStates: string[];
  powerUnitsRoster: PowerUnit[];
  driversRoster: Driver[];
};

export type Filing = {
  id: string;
  type: "MCS-150" | "IFTA" | "IRP" | "D&A" | "BOC-3" | "Biennial" | "UCR";
  filedDate: string;
  period: string;
  status: "filed" | "amended" | "pending";
  jurisdiction?: string;
};

export type ComplianceSnapshot = {
  mcs150: { filedAt: string; nextDue: string };
  ifta: { quarter: string; due: string; lastFiled: string };
  irp: { renewalDue: string; jurisdictions: number };
  daConsortium: {
    name: string;
    status: "enrolled" | "pending" | "missing";
    enrolledDate: string;
    lastQuery: string;
  };
  boc3: {
    status: "filed" | "missing";
    agent?: string;
    agentAddress?: string;
    filedDate?: string;
  };
  biennial: { lastFiled: string; nextDue: string };
  ucr: { year: number; status: "filed" | "pending"; filedDate?: string };
  filings: Filing[];
};

export type Deadline = {
  id: string;
  type: string;
  label: string;
  dueDate: string;
  daysToDue: number;
  status: HealthStatus;
};

export type FeedEvent = {
  id: string;
  category:
    | "compliance"
    | "freight"
    | "insurance"
    | "financing"
    | "equipment"
    | "safety"
    | "authority";
  timestamp: string;
  relativeTime: string;
  title: string;
  body: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  status?: HealthStatus;
};

export type InboxCategory =
  | "compliance"
  | "freight"
  | "insurance"
  | "financing"
  | "equipment"
  | "safety"
  | "authority"
  | "system";

export type InboxMessage = {
  id: string;
  category: InboxCategory;
  subject: string;
  preview: string;
  body: string;
  fromName: string;
  fromEmail: string;
  sentAt: string;
  relativeTime: string;
  read: boolean;
  important: boolean;
  primaryAction?: { label: string; href: string };
};

export type NotificationCadence = "immediate" | "daily_digest" | "weekly_digest" | "off";

export type NotificationPreference = {
  category: InboxCategory;
  label: string;
  description: string;
  cadence: NotificationCadence;
};

export type DashboardData = {
  carrier: CarrierProfile;
  mcs150: Mcs150;
  insurance: InsuranceOnFile;
  worstBasic: CsaBasic;
  safety: SafetySnapshot;
  fleet: FleetSnapshot;
  compliance: ComplianceSnapshot;
  deadlines: Deadline[];
  feed: FeedEvent[];
  inbox: InboxMessage[];
  notificationPreferences: NotificationPreference[];
};

const DEFAULT_DOT = "1234567";

export function getMockDashboard(dotNumber?: string): DashboardData {
  const dot = (dotNumber ?? DEFAULT_DOT).replace(/\D/g, "") || DEFAULT_DOT;

  const carrier: CarrierProfile = {
    dotNumber: dot,
    mcNumber: "MC-851402",
    legalName: "Acme Carrier LLC",
    dba: "Acme Transport",
    status: "active",
    authorityTypes: ["Common", "Contract"],
    carrierOperation: "Interstate / For-Hire",
    authorityGranted: "Jan 14, 2019",
    authorityAge: { years: 7, months: 4 },
    powerUnits: 8,
    drivers: 11,
    domicileState: "TX",
    operatingStates: ["TX", "OK", "NM", "AR", "LA"],
    cargoCarried: ["General Freight", "Building Materials", "Machinery"],
    hazmatEndorsed: false,
    refreshedAt: "6 hours ago",
    legalAddress: {
      street: "4218 Industrial Pkwy",
      city: "Dallas",
      state: "TX",
      zip: "75247",
    },
    phone: "(214) 555-0118",
    emailOnFile: "ops@acmecarrier.com",
  };

  const mcs150: Mcs150 = {
    filedAt: "Dec 22, 2025",
    daysSinceFiled: 142,
    nextDueIn: 583,
    status: "good",
  };

  const insurance: InsuranceOnFile = {
    bipdLimit: "$1,000,000",
    cargoLimit: "$100,000",
    insurer: "Continental Western Group",
    effective: "Aug 1, 2025",
    expires: "Aug 1, 2026",
    daysToExpiration: 82,
    status: "warn",
    policyNumber: "CWG-4471829-B",
    agent: { name: "Brookhaven Commercial", phone: "(972) 555-0184" },
    history: [
      {
        type: "BIPD",
        insurer: "Continental Western Group",
        effective: "Aug 1, 2025",
        expired: "—",
      },
      {
        type: "BIPD",
        insurer: "Progressive Commercial",
        effective: "Aug 1, 2024",
        expired: "Aug 1, 2025",
      },
      {
        type: "Cargo",
        insurer: "Continental Western Group",
        effective: "Aug 1, 2025",
        expired: "—",
      },
    ],
  };

  const basics: CsaBasic[] = [
    { name: "Unsafe Driving", percentile: 42, status: "good", trend: "down", trendDelta: -6 },
    { name: "Hours-of-Service", percentile: 76, status: "warn", trend: "up", trendDelta: 11 },
    { name: "Driver Fitness", percentile: 18, status: "good", trend: "flat", trendDelta: 0 },
    { name: "Controlled Substances", percentile: 8, status: "good", trend: "flat", trendDelta: 0 },
    { name: "Vehicle Maintenance", percentile: 51, status: "good", trend: "down", trendDelta: -3 },
    { name: "Hazmat", percentile: 0, status: "good", trend: "flat", trendDelta: 0 },
    { name: "Crash Indicator", percentile: 34, status: "good", trend: "up", trendDelta: 4 },
  ];

  const worstBasic = basics.reduce((max, b) =>
    b.percentile > max.percentile ? b : max,
  );

  const crashList: Crash[] = [
    {
      id: "c1",
      date: "Sep 14, 2024",
      state: "TX",
      location: "I-35 NB, mile marker 218, Waco",
      severity: "tow-away",
      ooss: false,
      reportNumber: "TX-2024-094182",
      hazmat: false,
    },
  ];

  const inspectionList: Inspection[] = [
    {
      id: "i1",
      date: "Apr 28, 2026",
      state: "TX",
      location: "I-40 EB scale, Amarillo",
      level: 2,
      type: "vehicle+driver",
      vehicleViolations: 0,
      driverViolations: 0,
      ooss: false,
      unitNumber: "PU-04",
      driverName: "M. Aleman",
    },
    {
      id: "i2",
      date: "Mar 14, 2026",
      state: "NM",
      location: "I-40 WB scale, Tucumcari",
      level: 3,
      type: "driver",
      vehicleViolations: 0,
      driverViolations: 1,
      ooss: false,
      unitNumber: "PU-07",
      driverName: "R. Vasquez",
    },
    {
      id: "i3",
      date: "Feb 28, 2026",
      state: "OK",
      location: "I-44 EB scale, Big Cabin",
      level: 1,
      type: "vehicle+driver",
      vehicleViolations: 0,
      driverViolations: 0,
      ooss: false,
      unitNumber: "PU-02",
      driverName: "T. Boudreaux",
    },
    {
      id: "i4",
      date: "Jan 19, 2026",
      state: "AR",
      location: "I-30 NB scale, Texarkana",
      level: 2,
      type: "vehicle",
      vehicleViolations: 1,
      driverViolations: 0,
      ooss: false,
      unitNumber: "PU-05",
    },
    {
      id: "i5",
      date: "Dec 12, 2025",
      state: "LA",
      location: "I-20 EB scale, Greenwood",
      level: 1,
      type: "vehicle+driver",
      vehicleViolations: 0,
      driverViolations: 0,
      ooss: false,
      unitNumber: "PU-01",
      driverName: "M. Aleman",
    },
    {
      id: "i6",
      date: "Nov 4, 2025",
      state: "TX",
      location: "I-10 EB scale, Sierra Blanca",
      level: 3,
      type: "driver",
      vehicleViolations: 0,
      driverViolations: 0,
      ooss: false,
      unitNumber: "PU-03",
      driverName: "K. Pham",
    },
    {
      id: "i7",
      date: "Oct 22, 2025",
      state: "TX",
      location: "I-35 SB scale, Lampasas",
      level: 2,
      type: "vehicle+driver",
      vehicleViolations: 2,
      driverViolations: 0,
      ooss: false,
      unitNumber: "PU-06",
      driverName: "J. Tran",
    },
    {
      id: "i8",
      date: "Sep 14, 2025",
      state: "TX",
      location: "I-20 EB scale, Eastland",
      level: 1,
      type: "vehicle+driver",
      vehicleViolations: 0,
      driverViolations: 0,
      ooss: false,
      unitNumber: "PU-04",
      driverName: "M. Aleman",
    },
  ];

  const safety: SafetySnapshot = {
    crashes24mo: 1,
    crashesOutOfService: 0,
    inspectionsVehicle24mo: 9,
    inspectionsDriver24mo: 14,
    vehicleOosRate: 11.1,
    driverOosRate: 0.0,
    basics,
    crashList,
    inspectionList,
    lastAudit: null,
  };

  const powerUnitsRoster: PowerUnit[] = [
    { id: "pu1", unitNumber: "PU-01", year: 2022, make: "Freightliner", model: "Cascadia", vin: "1FUJGHDV2NLAA1234", plateNumber: "TX-9417AC", plateState: "TX", equipmentClass: "Dry van", inService: true, inspections24mo: 3, oosCount: 0 },
    { id: "pu2", unitNumber: "PU-02", year: 2021, make: "Freightliner", model: "Cascadia", vin: "1FUJGHDV2MLAA9182", plateNumber: "TX-9418AC", plateState: "TX", equipmentClass: "Dry van", inService: true, inspections24mo: 2, oosCount: 0 },
    { id: "pu3", unitNumber: "PU-03", year: 2020, make: "Peterbilt", model: "579", vin: "1XPBDP9X1LD703428", plateNumber: "TX-9419AC", plateState: "TX", equipmentClass: "Dry van", inService: true, inspections24mo: 1, oosCount: 0 },
    { id: "pu4", unitNumber: "PU-04", year: 2023, make: "Freightliner", model: "Cascadia", vin: "1FUJGHDV2PLAA4527", plateNumber: "TX-9420AC", plateState: "TX", equipmentClass: "Reefer", inService: true, inspections24mo: 4, oosCount: 0 },
    { id: "pu5", unitNumber: "PU-05", year: 2019, make: "Kenworth", model: "T680", vin: "1XKYDP9X9KJ438192", plateNumber: "TX-9421AC", plateState: "TX", equipmentClass: "Dry van", inService: true, inspections24mo: 2, oosCount: 1 },
    { id: "pu6", unitNumber: "PU-06", year: 2024, make: "Volvo", model: "VNL 760", vin: "4V4NC9EH8RN628419", plateNumber: "TX-9422AC", plateState: "TX", equipmentClass: "Reefer", inService: true, inspections24mo: 1, oosCount: 0 },
    { id: "pu7", unitNumber: "PU-07", year: 2024, make: "Freightliner", model: "Cascadia", vin: "1FUJGHDV2RLAA7821", plateNumber: "TX-9423AC", plateState: "TX", equipmentClass: "Dry van", inService: true, inspections24mo: 1, oosCount: 0 },
    { id: "pu8", unitNumber: "PU-08", year: 2025, make: "Mack", model: "Anthem", vin: "1M1AN07Y4SP012345", plateNumber: "TX-9424AC", plateState: "TX", equipmentClass: "Reefer", inService: true, inspections24mo: 0, oosCount: 0 },
  ];

  const driversRoster: Driver[] = [
    { id: "d1", firstName: "Mateo", lastName: "Aleman", cdlState: "TX", cdlClass: "A", hireDate: "Feb 18, 2020", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 4 },
    { id: "d2", firstName: "Travis", lastName: "Boudreaux", cdlState: "LA", cdlClass: "A", hireDate: "May 6, 2021", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 3 },
    { id: "d3", firstName: "Khoa", lastName: "Pham", cdlState: "TX", cdlClass: "A", hireDate: "Nov 14, 2022", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 2 },
    { id: "d4", firstName: "Janelle", lastName: "Tran", cdlState: "TX", cdlClass: "A", hireDate: "Jan 9, 2023", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 2 },
    { id: "d5", firstName: "Rafael", lastName: "Vasquez", cdlState: "NM", cdlClass: "A", hireDate: "Apr 22, 2023", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 1 },
    { id: "d6", firstName: "Adriana", lastName: "Solis", cdlState: "TX", cdlClass: "A", hireDate: "Aug 30, 2023", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 1 },
    { id: "d7", firstName: "Wesley", lastName: "Holloway", cdlState: "OK", cdlClass: "A", hireDate: "Feb 12, 2024", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 1 },
    { id: "d8", firstName: "Carla", lastName: "Whitfield", cdlState: "TX", cdlClass: "A", hireDate: "Jun 4, 2024", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 0 },
    { id: "d9", firstName: "Marcus", lastName: "Lindholm", cdlState: "AR", cdlClass: "A", hireDate: "Sep 18, 2024", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 0 },
    { id: "d10", firstName: "Becky", lastName: "Carter", cdlState: "TX", cdlClass: "A", hireDate: "Jan 7, 2025", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 0 },
    { id: "d11", firstName: "Ann Marie", lastName: "Sundvall", cdlState: "TX", cdlClass: "A", hireDate: "Apr 1, 2025", hazmatEndorsed: false, mvrLastPulled: "Mar 1, 2026", inspections24mo: 0 },
  ];

  const fleet: FleetSnapshot = {
    powerUnitsNow: 8,
    powerUnits90dAgo: 6,
    driversNow: 11,
    drivers90dAgo: 8,
    inspectionStates: ["TX", "OK", "NM", "AR", "LA", "MO", "KS"],
    powerUnitsRoster,
    driversRoster,
  };

  const filings: Filing[] = [
    { id: "f1", type: "MCS-150", filedDate: "Dec 22, 2025", period: "Biennial 2025-2027", status: "filed" },
    { id: "f2", type: "IFTA", filedDate: "Jan 28, 2026", period: "Q4 2025", status: "filed" },
    { id: "f3", type: "IRP", filedDate: "Sep 22, 2025", period: "2025-2026", status: "filed", jurisdiction: "TX (base) + OK, NM, AR, LA" },
    { id: "f4", type: "D&A", filedDate: "Mar 25, 2026", period: "Q1 2026 query cycle", status: "filed" },
    { id: "f5", type: "UCR", filedDate: "Dec 14, 2025", period: "2026", status: "filed" },
    { id: "f6", type: "Biennial", filedDate: "Dec 22, 2025", period: "2025-2027", status: "filed" },
  ];

  const compliance: ComplianceSnapshot = {
    mcs150: { filedAt: "Dec 22, 2025", nextDue: "Dec 31, 2027" },
    ifta: { quarter: "Q1 2026", due: "Apr 30, 2026", lastFiled: "Jan 28, 2026" },
    irp: { renewalDue: "Sep 30, 2026", jurisdictions: 5 },
    daConsortium: { name: "DriverFacts D&A", status: "enrolled", enrolledDate: "Feb 4, 2020", lastQuery: "Mar 25, 2026" },
    boc3: { status: "filed", agent: "Process Agents of America", agentAddress: "PO Box 1481, Hampton VA 23669", filedDate: "Jan 14, 2019" },
    biennial: { lastFiled: "Dec 22, 2025", nextDue: "Dec 31, 2027" },
    ucr: { year: 2026, status: "filed", filedDate: "Dec 14, 2025" },
    filings,
  };

  const deadlines: Deadline[] = [
    { id: "dl1", type: "IFTA", label: "Q1 2026 IFTA filing", dueDate: "Apr 30, 2026", daysToDue: 21, status: "warn" },
    { id: "dl2", type: "Insurance", label: "Insurance renewal (BIPD + cargo)", dueDate: "Aug 1, 2026", daysToDue: 82, status: "warn" },
    { id: "dl3", type: "IRP", label: "IRP renewal", dueDate: "Sep 30, 2026", daysToDue: 142, status: "good" },
    { id: "dl4", type: "D&A", label: "Q3 D&A consortium query", dueDate: "Jul 1, 2026", daysToDue: 52, status: "good" },
    { id: "dl5", type: "UCR", label: "UCR 2027 registration", dueDate: "Dec 31, 2026", daysToDue: 234, status: "good" },
  ];

  const feed: FeedEvent[] = [
    {
      id: "evt-1",
      category: "compliance",
      timestamp: "2026-04-09T14:00:00Z",
      relativeTime: "Yesterday · 2:14pm",
      title: "Q1 IFTA filing due in 21 days",
      body: "Quarter ends Mar 31. Filing deadline Apr 30, 2026. We'll send a 7-day reminder.",
      primaryAction: { label: "File now", href: "#" },
      secondaryAction: { label: "Remind me in 14 days", href: "#" },
      status: "warn",
    },
    {
      id: "evt-2",
      category: "freight",
      timestamp: "2026-04-09T11:30:00Z",
      relativeTime: "Yesterday · 11:32am",
      title: "3 lanes posted that match your equipment + states",
      body: "Dallas → Albuquerque dry van, Houston → OKC reefer, Tulsa → Little Rock dry van.",
      primaryAction: { label: "View lanes", href: "#" },
    },
    {
      id: "evt-3",
      category: "insurance",
      timestamp: "2026-04-08T15:45:00Z",
      relativeTime: "2 days ago",
      title: "Insurance renewal in 82 days",
      body: "Continental Western expires Aug 1, 2026 (BIPD $1M, cargo $100K). Lock quotes now from brokers writing TX general freight.",
      primaryAction: { label: "Request quotes", href: "#" },
      secondaryAction: { label: "Dismiss for 30 days", href: "#" },
      status: "warn",
    },
    {
      id: "evt-4",
      category: "safety",
      timestamp: "2026-04-07T09:15:00Z",
      relativeTime: "3 days ago",
      title: "Clean roadside inspection logged",
      body: "PU #4 inspected at I-40 Amarillo eastbound scale on Apr 7. No violations. CSA Vehicle Maintenance percentile holding at 51.",
    },
    {
      id: "evt-5",
      category: "financing",
      timestamp: "2026-04-04T16:00:00Z",
      relativeTime: "6 days ago",
      title: "Financing quote received from RTS Financial",
      body: "Non-recourse, 2.5% on receivables >$10K, same-day funding. Two more quotes pending.",
      primaryAction: { label: "Compare quotes", href: "#" },
    },
    {
      id: "evt-6",
      category: "authority",
      timestamp: "2026-04-01T08:00:00Z",
      relativeTime: "9 days ago",
      title: "Fleet size update detected",
      body: "Power units in your MCS-150 increased from 6 to 8. Two trailers added. We've updated your safety percentile baselines.",
    },
    {
      id: "evt-7",
      category: "compliance",
      timestamp: "2026-03-25T10:00:00Z",
      relativeTime: "16 days ago",
      title: "D&A consortium quarterly query completed",
      body: "All 11 drivers cleared in the Phase II Clearinghouse query. Next query window opens Jul 1.",
    },
  ];

  const inbox: InboxMessage[] = [
    {
      id: "msg-1",
      category: "compliance",
      subject: "Q1 IFTA filing due in 21 days",
      preview:
        "Quarter ends Mar 31. Filing deadline Apr 30, 2026. File now from your dashboard or schedule a reminder.",
      body:
        "Your Q1 IFTA filing is due April 30, 2026 — 21 days from now.\n\nThis quarter you traveled in 5 jurisdictions: TX (base), OK, NM, AR, LA. We have your fuel purchase records synced from your fleet card program, so the filing pre-populates.\n\nFile now → /dashboard/" + dot + "/compliance\n\nWe'll send a 7-day reminder if you haven't filed by Apr 23.",
      fromName: "Compliance reminders",
      fromEmail: "compliance@licensedtohaul.com",
      sentAt: "2026-04-09T14:00:00Z",
      relativeTime: "Yesterday · 2:14pm",
      read: false,
      important: true,
      primaryAction: { label: "File IFTA Q1 now", href: `/dashboard/${dot}/compliance` },
    },
    {
      id: "msg-2",
      category: "freight",
      subject: "3 lanes match your authority — TX, OK, NM",
      preview:
        "Dallas → Albuquerque dry van, Houston → OKC reefer, Tulsa → Little Rock dry van. Posted in the last 2 hours.",
      body:
        "Three lanes matched your operating profile in the last 2 hours:\n\n• Dallas, TX → Albuquerque, NM · Dry van · $2,150 ($3.28/mi) · Echo Global Logistics, quick-pay 7d\n• Houston, TX → Oklahoma City, OK · Reefer · $1,875 ($4.16/mi) · RXO Logistics, net-30\n• Tulsa, OK → Little Rock, AR · Dry van · $1,100 ($4.10/mi) · Coyote Logistics, quick-pay 2d\n\nView lanes → /dashboard/" + dot + "/freight",
      fromName: "Freight feed",
      fromEmail: "freight@licensedtohaul.com",
      sentAt: "2026-04-09T11:30:00Z",
      relativeTime: "Yesterday · 11:32am",
      read: false,
      important: false,
      primaryAction: { label: "View lanes", href: `/dashboard/${dot}/freight` },
    },
    {
      id: "msg-3",
      category: "insurance",
      subject: "Insurance renewal in 82 days — quotes in motion",
      preview:
        "Continental Western expires Aug 1, 2026. Three quote requests sent to brokers writing TX general freight.",
      body:
        "Your BIPD and cargo coverage with Continental Western expires August 1, 2026 — 82 days from now.\n\nQuote requests sent to:\n• Brookhaven Commercial — quote received ($14,240/yr, $2,500 deductible)\n• Lone Star Specialty — quote received ($13,890/yr, $5,000 deductible)\n• Heritage Trucking — pending, underwriter reviewing\n\nBest quote so far is $350/yr lower than your current premium. Compare side-by-side from the Insurance page.",
      fromName: "Insurance",
      fromEmail: "insurance@licensedtohaul.com",
      sentAt: "2026-04-08T15:45:00Z",
      relativeTime: "2 days ago",
      read: true,
      important: true,
      primaryAction: { label: "Compare quotes", href: `/dashboard/${dot}/insurance` },
    },
    {
      id: "msg-4",
      category: "safety",
      subject: "Clean roadside inspection — PU-04",
      preview:
        "PU-04 inspected at I-40 Amarillo eastbound scale on Apr 7. No violations. Vehicle Maintenance percentile holding at 51.",
      body:
        "A Level 2 roadside inspection was completed on PU-04 (M. Aleman) at the I-40 EB scale near Amarillo on April 7, 2026.\n\nResult: No violations. No out-of-service.\n\nYour CSA Vehicle Maintenance percentile holds at 51. This inspection adds to your 24-month clean inspection count (now 9 vehicle / 14 driver).",
      fromName: "Safety",
      fromEmail: "safety@licensedtohaul.com",
      sentAt: "2026-04-07T09:15:00Z",
      relativeTime: "3 days ago",
      read: true,
      important: false,
    },
    {
      id: "msg-5",
      category: "financing",
      subject: "Financing quote: RTS Financial — 2.5% non-recourse",
      preview:
        "Non-recourse factoring, 2.5% on invoices > $10K, same-day funding. Free fuel-advance program included.",
      body:
        "RTS Financial returned a financing quote:\n\n• Rate: 2.5% on invoices over $10,000\n• Funding speed: Same-day\n• Recourse: Non-recourse (RTS absorbs bad-debt risk)\n• Monthly minimum: $50K monthly invoice volume\n• Bonus: Free fuel-advance up to 40% on covered loads\n\nTwo more quotes pending (TBS Factoring, Apex Capital).",
      fromName: "Financing",
      fromEmail: "financing@licensedtohaul.com",
      sentAt: "2026-04-04T16:00:00Z",
      relativeTime: "6 days ago",
      read: true,
      important: false,
      primaryAction: { label: "Compare financing quotes", href: `/dashboard/${dot}/financing` },
    },
    {
      id: "msg-6",
      category: "authority",
      subject: "Fleet size update detected: +2 power units",
      preview:
        "Your MCS-150 power-unit count increased from 6 to 8. Two trailers added. Safety baselines updated.",
      body:
        "We picked up a change in your MCS-150 filing: power-unit count increased from 6 to 8. Two trailers were added in the most recent biennial update.\n\nWhat this changes:\n• Your CSA percentile baselines have been recalculated against the 8-unit operating-class peer group\n• Your insurance broker may want fresh quotes to reflect the larger fleet (we've flagged your renewal)\n• Your freight match radius expands slightly (more lanes will fit your equipment count)",
      fromName: "Authority watcher",
      fromEmail: "authority@licensedtohaul.com",
      sentAt: "2026-04-01T08:00:00Z",
      relativeTime: "9 days ago",
      read: true,
      important: false,
    },
    {
      id: "msg-7",
      category: "compliance",
      subject: "D&A consortium Q1 query completed — all clean",
      preview:
        "All 11 drivers cleared in the Phase II Clearinghouse query. Next query window opens Jul 1.",
      body:
        "DriverFacts D&A ran the Phase II Clearinghouse query for all 11 active drivers on March 25, 2026. All drivers cleared — no violations, no pending tests, no refusals on record.\n\nNext mandatory query window opens July 1, 2026. We'll fire the reminder a week ahead.",
      fromName: "Compliance reminders",
      fromEmail: "compliance@licensedtohaul.com",
      sentAt: "2026-03-25T10:00:00Z",
      relativeTime: "16 days ago",
      read: true,
      important: false,
    },
    {
      id: "msg-8",
      category: "system",
      subject: "Welcome — your dashboard is live",
      preview:
        "Your authority is claimed. We've pulled your live FMCSA profile and indexed compliance, safety, and fleet records.",
      body:
        "Welcome to Licensed to Haul.\n\nWe've pulled your live FMCSA profile for USDOT " + dot + " — authority status, MCS-150, crashes, inspections, hazmat endorsements, fleet roster. Refreshed daily.\n\nWhat happens from here:\n• Compliance deadlines hit your inbox before they hit your status\n• Freight that fits your equipment + lanes appears in /freight when posted\n• Insurance / financing / fuel / equipment opportunities surface when relevant\n• Quiet by default — we email when something matters\n\nNotification cadence is set to default — adjust any category in Settings.",
      fromName: "Licensed to Haul",
      fromEmail: "hello@licensedtohaul.com",
      sentAt: "2026-03-04T15:18:00Z",
      relativeTime: "37 days ago",
      read: true,
      important: false,
      primaryAction: { label: "Open dashboard", href: `/dashboard/${dot}` },
    },
  ];

  const notificationPreferences: NotificationPreference[] = [
    {
      category: "compliance",
      label: "Compliance deadlines",
      description: "MCS-150 refresh windows, IFTA quarters, IRP renewals, D&A queries, biennial filings.",
      cadence: "immediate",
    },
    {
      category: "freight",
      label: "Freight matches",
      description: "Lanes posted that match your equipment, operating geography, and lane history.",
      cadence: "daily_digest",
    },
    {
      category: "insurance",
      label: "Insurance quotes + renewals",
      description: "Quote arrivals, renewal-window opens, insurer L&I updates affecting your policy.",
      cadence: "immediate",
    },
    {
      category: "financing",
      label: "Financing offers",
      description: "Factoring, fuel-advance, and working-capital quotes from operators that fund your profile.",
      cadence: "weekly_digest",
    },
    {
      category: "equipment",
      label: "Equipment financing offers",
      description: "Purchase, lease-to-own, and refinance offers — only when an offer beats your current rate.",
      cadence: "weekly_digest",
    },
    {
      category: "safety",
      label: "Safety + CSA",
      description: "New inspections, crash records, CSA BASIC shifts of more than 5 percentile points.",
      cadence: "immediate",
    },
    {
      category: "authority",
      label: "Authority changes",
      description: "MCS-150 changes, fleet size shifts, registration updates picked up from the federal data.",
      cadence: "immediate",
    },
    {
      category: "system",
      label: "Product updates",
      description: "New features, weekly digests, security notices.",
      cadence: "weekly_digest",
    },
  ];

  return {
    carrier,
    mcs150,
    insurance,
    worstBasic,
    safety,
    fleet,
    compliance,
    deadlines,
    feed,
    inbox,
    notificationPreferences,
  };
}
