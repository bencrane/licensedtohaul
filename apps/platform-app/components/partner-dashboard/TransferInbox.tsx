import Link from "next/link";
import {
  Truck,
  MapPin,
  Check,
  ChevronRight,
  Clock,
} from "lucide-react";
import type { TransferDisposition, TransferRow } from "@/lib/transfers/types";

const DISPOSITION_STYLES: Record<
  TransferDisposition,
  { label: string; chip: string }
> = {
  new: { label: "New", chip: "border-orange-300 bg-orange-50 text-orange-800" },
  contacted: {
    label: "Contacted",
    chip: "border-stone-300 bg-stone-100 text-stone-700",
  },
  quoted: { label: "Quoted", chip: "border-sky-300 bg-sky-50 text-sky-800" },
  won: {
    label: "Won",
    chip: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  lost: { label: "Lost", chip: "border-stone-300 bg-stone-50 text-stone-600" },
  rejected: {
    label: "Rejected",
    chip: "border-stone-300 bg-stone-50 text-stone-500",
  },
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (minutes >= 1) return `${minutes}m ago`;
  return "just now";
}

function SignalCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-stone-50 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.1em] text-stone-500">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[13px] text-stone-800">{value}</p>
    </div>
  );
}

function TransferCard({ slug, row }: { slug: string; row: TransferRow }) {
  const disp = DISPOSITION_STYLES[row.disposition];
  const cs = row.contact_snapshot;
  const criteria = (row.match_criteria as string[] | null) ?? [];
  const isClosed =
    row.disposition === "won" ||
    row.disposition === "lost" ||
    row.disposition === "rejected";

  return (
    <li>
      <Link
        href={`/partner/${slug}/deals/${row.id}`}
        className={`group block border ${row.disposition === "new" ? "border-orange-300" : "border-line"} bg-surface transition-colors hover:border-orange-300 ${isClosed ? "opacity-80" : ""}`}
      >
        <div className="grid gap-px bg-line md:grid-cols-12">
          {/* Left: carrier identity */}
          <div className="bg-surface p-5 md:col-span-4">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${disp.chip}`}
              >
                {row.disposition === "new" && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
                  </span>
                )}
                {disp.label}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                {relativeTime(row.created_at)}
              </span>
            </div>

            <h3 className="font-display mt-4 text-xl leading-tight text-stone-900">
              {cs.name}
            </h3>
            {cs.dba && (
              <p className="mt-0.5 text-xs text-stone-500">DBA {cs.dba}</p>
            )}

            <dl className="mt-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-stone-500">USDOT</dt>
                <dd className="font-mono text-stone-800">{cs.usdot}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-stone-500">Domicile</dt>
                <dd className="inline-flex items-center gap-1 text-stone-800">
                  <MapPin className="h-3 w-3 text-stone-400" />
                  {cs.domicile}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-stone-500">Fleet</dt>
                <dd className="text-stone-800">
                  {cs.power_units} PU
                  {cs.drivers != null && ` · ${cs.drivers} drv`}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-stone-500">Equipment</dt>
                <dd className="inline-flex items-center gap-1 text-stone-800">
                  <Truck className="h-3 w-3 text-stone-400" />
                  {cs.equipment_class}
                </dd>
              </div>
              {cs.hazmat && (
                <div className="flex items-center justify-between">
                  <dt className="text-stone-500">Hazmat</dt>
                  <dd className="font-semibold text-orange-800">Endorsed</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Middle: why it fits + signals */}
          <div className="bg-surface p-5 md:col-span-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Why this carrier fits your spec
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] leading-snug text-stone-700">
              {criteria.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 flex-none text-orange-600"
                    strokeWidth={3}
                  />
                  <span>{c}</span>
                </li>
              ))}
            </ul>

            {row.signals && Object.keys(row.signals).length > 0 && (
              <>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Federal-data signals
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  {row.signals.authority_age_years != null && (
                    <SignalCell label="Authority age" value={`${row.signals.authority_age_years}y`} />
                  )}
                  {row.signals.csa_basic && (
                    <SignalCell label="CSA basic" value={String(row.signals.csa_basic)} />
                  )}
                  {row.signals.oos_rate && (
                    <SignalCell label="OOS rate" value={String(row.signals.oos_rate)} />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: open chevron + last-activity timestamps */}
          <div className="flex flex-col justify-between bg-surface p-5 md:col-span-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Last activity
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-stone-700">
                <Clock className="h-3 w-3 text-stone-400" />
                {row.closed_at
                  ? `Closed ${relativeTime(row.closed_at)}`
                  : row.quoted_at
                    ? `Quoted ${relativeTime(row.quoted_at)}`
                    : row.contacted_at
                      ? `Contacted ${relativeTime(row.contacted_at)}`
                      : `Received ${relativeTime(row.created_at)}`}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500 transition-colors group-hover:text-orange-700">
              Open
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

export default function TransferInbox({
  slug,
  transfers,
}: {
  slug: string;
  transfers: TransferRow[];
}) {
  const newCount = transfers.filter((t) => t.disposition === "new").length;

  if (transfers.length === 0) {
    return (
      <div className="mx-auto max-w-md border border-line bg-surface px-7 py-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
          No deals yet
        </p>
        <h2 className="font-display mt-1.5 text-xl text-stone-900">
          Your inbox is empty.
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-stone-600">
          When carriers request a quote, their deal appears here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {transfers.map((t) => (
          <TransferCard key={t.id} slug={slug} row={t} />
        ))}
      </ul>
    </div>
  );
}
