import { FileText, ShieldCheck, AlertTriangle, Activity } from "lucide-react";
import type {
  HealthStatus,
  Mcs150,
  InsuranceOnFile,
  CsaBasic,
  SafetySnapshot,
} from "@/lib/mock-dashboard";

const STATUS_STYLES: Record<HealthStatus, { dot: string; ring: string; text: string }> = {
  good: { dot: "bg-emerald-500", ring: "border-emerald-200", text: "text-emerald-800" },
  warn: { dot: "bg-amber-500", ring: "border-amber-200", text: "text-amber-800" },
  alert: { dot: "bg-red-500", ring: "border-red-200", text: "text-red-800" },
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  good: "On track",
  warn: "Attention",
  alert: "Action needed",
};

type TileProps = {
  label: string;
  icon: React.ReactNode;
  status: HealthStatus;
  value: string;
  detail: string;
};

function HealthTile({ label, icon, status, value, detail }: TileProps) {
  const s = STATUS_STYLES[status];
  return (
    <div className="bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-7 w-7 items-center justify-center border border-line text-stone-600">
          {icon}
        </span>
        <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.ring} ${s.text}`}>
          <span className={`inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="font-display mt-1 text-2xl leading-tight text-stone-900">
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">{detail}</p>
    </div>
  );
}

export default function HealthRow({
  mcs150,
  insurance,
  worstBasic,
  safety,
}: {
  mcs150: Mcs150;
  insurance: InsuranceOnFile;
  worstBasic: CsaBasic;
  safety: SafetySnapshot;
}) {
  const oosRate = safety.vehicleOosRate;
  const oosStatus: HealthStatus =
    oosRate >= 20 ? "alert" : oosRate >= 10 ? "warn" : "good";

  return (
    <section className="border-b border-line bg-stone-100">
      <div className="mx-auto max-w-[1400px] px-6 py-5">
        <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
          <HealthTile
            label="MCS-150"
            icon={<FileText className="h-4 w-4" />}
            status={mcs150.status}
            value={`${mcs150.nextDueIn} days`}
            detail={`Filed ${mcs150.daysSinceFiled} days ago · next refresh due`}
          />
          <HealthTile
            label="Insurance on file"
            icon={<ShieldCheck className="h-4 w-4" />}
            status={insurance.status}
            value={`${insurance.daysToExpiration} days`}
            detail={`${insurance.bipdLimit} BIPD · ${insurance.insurer}`}
          />
          <HealthTile
            label="Worst BASIC"
            icon={<AlertTriangle className="h-4 w-4" />}
            status={worstBasic.status}
            value={worstBasic.percentile === null ? "—" : `${worstBasic.percentile}%`}
            detail={
              worstBasic.percentile === null
                ? "Not rated — below SMS volume threshold"
                : worstBasic.name
            }
          />
          <HealthTile
            label="Vehicle OOS rate"
            icon={<Activity className="h-4 w-4" />}
            status={oosStatus}
            value={`${oosRate.toFixed(1)}%`}
            detail={`${safety.inspectionsVehicle24mo} vehicle inspections, 24mo`}
          />
        </div>
      </div>
    </section>
  );
}
