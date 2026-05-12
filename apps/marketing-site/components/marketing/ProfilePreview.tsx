import { TrendingUp, Truck, BadgeCheck, Activity, FileText, Calendar } from "lucide-react";

type Row = {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  status?: "good" | "warn" | "neutral";
};

const rows: Row[] = [
  {
    icon: <BadgeCheck className="h-4 w-4" />,
    label: "Authority Status",
    value: "Active",
    detail: "Common · Contract",
    status: "good",
  },
  {
    icon: <Calendar className="h-4 w-4" />,
    label: "Authority Age",
    value: "7 yrs · 4 mo",
    detail: "Granted Jan 2019",
  },
  {
    icon: <Truck className="h-4 w-4" />,
    label: "Power Units",
    value: "8",
    detail: "11 drivers",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    label: "MCS-150 Refresh",
    value: "142 days ago",
    detail: "Next due in 583 days",
    status: "good",
  },
  {
    icon: <Activity className="h-4 w-4" />,
    label: "Inspections (24mo)",
    value: "14",
    detail: "0 out-of-service",
    status: "good",
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Fleet Growth YoY",
    value: "+12.5%",
    detail: "5 → 8 units",
    status: "good",
  },
];

export default function ProfilePreview() {
  return (
    <div className="overflow-hidden border border-line-strong bg-white shadow-[0_1px_0_rgba(26,20,16,0.04),0_24px_60px_-30px_rgba(26,20,16,0.18)]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line bg-stone-50 px-6 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Authority Profile · Preview
          </p>
          <p className="mt-1 font-display text-lg text-stone-900">
            Acme Carrier LLC
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            USDOT
          </p>
          <p className="mt-1 font-mono text-base text-stone-800">1234567</p>
        </div>
      </div>

      {/* live indicator */}
      <div className="flex items-center gap-2 border-b border-line bg-orange-50/50 px-6 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-orange-800">
          Live · Refreshed 6 hours ago from FMCSA
        </span>
      </div>

      {/* rows */}
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center border ${
                  row.status === "good"
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : "border-line bg-stone-50 text-stone-500"
                }`}
              >
                {row.icon}
              </span>
              <div>
                <p className="text-sm font-medium text-stone-800">{row.label}</p>
                {row.detail && (
                  <p className="text-xs text-stone-500">{row.detail}</p>
                )}
              </div>
            </div>
            <p
              className={`font-display text-lg ${
                row.status === "good" ? "text-stone-900" : "text-stone-800"
              }`}
            >
              {row.value}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
