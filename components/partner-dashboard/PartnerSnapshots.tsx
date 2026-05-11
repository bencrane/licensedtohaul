import { Lock, ArrowUpRight, AlertCircle } from "lucide-react";
import type {
  LockedSpec,
  Agreement,
  DispositionBreakdown,
  DeliveryStatus,
  AudienceDriftEvent,
  PartnerProfile,
  TransferDisposition,
} from "@/lib/mock-partner";

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {title}
        </h3>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function SpecCard({
  spec,
  drift,
}: {
  spec: LockedSpec;
  drift: AudienceDriftEvent[];
}) {
  return (
    <Card
      title="Locked spec"
      action={
        <button className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-700 hover:text-orange-800">
          Adjust
          <ArrowUpRight className="h-3 w-3" />
        </button>
      }
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-stone-500">
        <Lock className="h-3 w-3" />
        Composed {spec.composedAt}
      </div>
      <dl className="space-y-2 text-xs">
        {spec.criteria.map((c) => (
          <div key={c.label} className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-b-0">
            <dt className="text-stone-500">{c.label}</dt>
            <dd className="text-right font-mono text-stone-800">{c.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Live audience
        </p>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="font-display text-3xl text-stone-900">
            {spec.audienceSizeNow.toLocaleString()}
          </p>
          <p className="font-mono text-xs text-emerald-700">
            {spec.audienceDriftNet >= 0 ? "+" : ""}
            {spec.audienceDriftNet}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] text-stone-500">
          carriers in your locked audience right now
        </p>

        <ul className="mt-3 space-y-1 text-[11px]">
          {drift.map((d) => (
            <li key={d.id} className="flex items-baseline justify-between">
              <span className="truncate text-stone-600">{d.label}</span>
              <span
                className={`font-mono ${d.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}
              >
                {d.delta >= 0 ? "+" : ""}
                {d.delta}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

const DELIVERY_BAR_TONES: Record<DeliveryStatus, string> = {
  on_track: "bg-emerald-500",
  slightly_behind: "bg-amber-500",
  behind: "bg-red-500",
  ahead: "bg-emerald-500",
};

const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  on_track: "On track for full delivery",
  slightly_behind: "Slightly behind projected pace",
  behind: "Behind pace — flag for review",
  ahead: "Ahead of pace",
};

export function DeliveryCard({
  agreement,
  deliveryStatus,
  projectedFinalDelivery,
}: {
  agreement: Agreement;
  deliveryStatus: DeliveryStatus;
  projectedFinalDelivery: number;
}) {
  const pct = Math.min(
    100,
    Math.round((agreement.transfersDelivered / agreement.transferTarget) * 100),
  );
  const projPct = Math.min(
    100,
    Math.round((projectedFinalDelivery / agreement.transferTarget) * 100),
  );
  const dayPct = Math.round((agreement.daysElapsed / agreement.windowDays) * 100);

  return (
    <Card title="Delivery">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-3xl text-stone-900">
            {agreement.transfersDelivered}
            <span className="text-stone-400">/{agreement.transferTarget}</span>
          </p>
          <p className="font-mono text-xs text-stone-500">{pct}%</p>
        </div>
        <p className="mt-0.5 text-[11px] text-stone-500">
          transfers delivered to date
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden bg-stone-100">
          <div
            className={`h-full ${DELIVERY_BAR_TONES[deliveryStatus]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-stone-700">
          Projected: <span className="font-mono text-stone-900">{projectedFinalDelivery}</span> of {agreement.transferTarget} ({projPct}%) by window close
        </p>
        <p
          className={`mt-1 text-[11px] ${
            deliveryStatus === "on_track" || deliveryStatus === "ahead"
              ? "text-emerald-800"
              : deliveryStatus === "slightly_behind"
                ? "text-amber-800"
                : "text-red-800"
          }`}
        >
          {DELIVERY_LABEL[deliveryStatus]}
        </p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Window
        </p>
        <div className="mt-2 flex items-baseline justify-between text-xs text-stone-700">
          <span>Day {agreement.daysElapsed}</span>
          <span className="font-mono text-stone-900">{dayPct}%</span>
          <span>{agreement.windowDays} days</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden bg-stone-100">
          <div
            className="h-full bg-stone-400"
            style={{ width: `${dayPct}%` }}
          />
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-stone-600">
          <AlertCircle className="h-3 w-3 text-stone-400" />
          Refund-or-rollover trigger: {agreement.slaRefundOrRolloverAfter}
        </p>
      </div>
    </Card>
  );
}

const DISPOSITION_TONES: Record<keyof DispositionBreakdown, string> = {
  new: "bg-orange-500",
  contacted: "bg-stone-400",
  quoted: "bg-sky-500",
  won: "bg-emerald-500",
  lost: "bg-stone-300",
};

const DISPOSITION_LABELS: { key: keyof DispositionBreakdown; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export function DispositionsCard({
  dispositions,
}: {
  dispositions: DispositionBreakdown;
}) {
  const total =
    dispositions.new +
    dispositions.contacted +
    dispositions.quoted +
    dispositions.won +
    dispositions.lost;
  const closed = dispositions.won + dispositions.lost;
  const winRate = closed > 0 ? Math.round((dispositions.won / closed) * 100) : 0;

  return (
    <Card title="Your pipeline">
      <ul className="space-y-3">
        {DISPOSITION_LABELS.map(({ key, label }) => {
          const value = dispositions[key];
          const pct = total > 0 ? (value / total) * 100 : 0;
          return (
            <li key={key}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-stone-700">{label}</span>
                <span className="font-mono text-stone-900">
                  {value}{" "}
                  <span className="text-stone-500">
                    ({pct.toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden bg-stone-100">
                <div
                  className={`h-full ${DISPOSITION_TONES[key]}`}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 border-t border-line pt-4 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-stone-500">Win rate (closed)</span>
          <span className="font-mono text-stone-900">{winRate}%</span>
        </div>
        <p className="mt-1 text-[11px] text-stone-500">
          Based on {closed} closed dispositions ({dispositions.won} won, {dispositions.lost} lost).
        </p>
      </div>
    </Card>
  );
}

export function AccountCard({
  partner,
  agreement,
}: {
  partner: PartnerProfile;
  agreement: Agreement;
}) {
  return (
    <Card title="Account">
      <dl className="space-y-2 text-xs">
        <div className="flex items-baseline justify-between border-b border-line pb-2">
          <dt className="text-stone-500">Status</dt>
          <dd className="text-emerald-800">Active</dd>
        </div>
        {partner.founding && (
          <div className="flex items-baseline justify-between border-b border-line pb-2">
            <dt className="text-stone-500">Cohort</dt>
            <dd className="font-mono text-stone-900">
              Founding · 0{partner.cohort}
            </dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-b border-line pb-2">
          <dt className="text-stone-500">Locked price</dt>
          <dd className="font-mono text-stone-900">
            ${agreement.pricePerTransferUsd} / transfer
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-line pb-2">
          <dt className="text-stone-500">Committed</dt>
          <dd className="font-mono text-stone-900">
            ${agreement.totalCommittedUsd.toLocaleString()}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-stone-500">Renewal decision</dt>
          <dd className="text-stone-800">{agreement.endsOn}</dd>
        </div>
      </dl>
    </Card>
  );
}
