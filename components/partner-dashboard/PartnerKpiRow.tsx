import { Inbox, Clock, Users, Mail } from "lucide-react";
import type {
  Agreement,
  LockedSpec,
  DeliveryStatus,
} from "@/lib/mock-partner";

const STATUS_STYLES: Record<DeliveryStatus, { dot: string; ring: string; text: string; label: string }> = {
  on_track: {
    dot: "bg-emerald-500",
    ring: "border-emerald-200",
    text: "text-emerald-800",
    label: "On track",
  },
  slightly_behind: {
    dot: "bg-amber-500",
    ring: "border-amber-200",
    text: "text-amber-800",
    label: "Slightly behind",
  },
  behind: {
    dot: "bg-red-500",
    ring: "border-red-200",
    text: "text-red-800",
    label: "Behind pace",
  },
  ahead: {
    dot: "bg-emerald-500",
    ring: "border-emerald-200",
    text: "text-emerald-800",
    label: "Ahead",
  },
};

type TileProps = {
  label: string;
  icon: React.ReactNode;
  value: string;
  detail: string;
  badge?: { text: string; status: DeliveryStatus };
  emphasis?: boolean;
};

function KpiTile({ label, icon, value, detail, badge, emphasis }: TileProps) {
  const s = badge ? STATUS_STYLES[badge.status] : null;
  return (
    <div className={`p-5 ${emphasis ? "bg-orange-50/40" : "bg-surface"}`}>
      <div className="flex items-center justify-between">
        <span className="inline-flex h-7 w-7 items-center justify-center border border-line text-stone-600">
          {icon}
        </span>
        {s && badge && (
          <span
            className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.ring} ${s.text}`}
          >
            <span className={`inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {badge.text}
          </span>
        )}
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

export default function PartnerKpiRow({
  agreement,
  spec,
  awaitingAction,
  deliveryStatus,
  projectedFinalDelivery,
}: {
  agreement: Agreement;
  spec: LockedSpec;
  awaitingAction: number;
  deliveryStatus: DeliveryStatus;
  projectedFinalDelivery: number;
}) {
  const pct = Math.round(
    (agreement.transfersDelivered / agreement.transferTarget) * 100,
  );
  const driftSign = spec.audienceDriftNet >= 0 ? "+" : "";

  return (
    <section className="border-b border-line bg-stone-100">
      <div className="mx-auto max-w-[1400px] px-6 py-5">
        <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="Transfers delivered"
            icon={<Inbox className="h-4 w-4" />}
            value={`${agreement.transfersDelivered} / ${agreement.transferTarget}`}
            detail={`${pct}% of target · projected ${projectedFinalDelivery} by window close`}
            badge={{
              text: STATUS_STYLES[deliveryStatus].label,
              status: deliveryStatus,
            }}
          />
          <KpiTile
            label="Days remaining"
            icon={<Clock className="h-4 w-4" />}
            value={`${agreement.daysRemaining} days`}
            detail={`Day ${agreement.daysElapsed} of ${agreement.windowDays} · ends ${agreement.endsOn}`}
          />
          <KpiTile
            label="Locked audience"
            icon={<Users className="h-4 w-4" />}
            value={spec.audienceSizeNow.toLocaleString()}
            detail={`${driftSign}${spec.audienceDriftNet} since spec lock (${spec.audienceSizeAtCompose.toLocaleString()})`}
          />
          <KpiTile
            label="Awaiting your action"
            icon={<Mail className="h-4 w-4" />}
            value={`${awaitingAction}`}
            detail="transfers in your inbox without disposition"
            emphasis={awaitingAction > 0}
          />
        </div>
      </div>
    </section>
  );
}
