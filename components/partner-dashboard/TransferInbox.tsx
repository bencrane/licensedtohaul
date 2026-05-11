import { Truck, MapPin, Phone, Mail, Check, X, MessageSquare, FileText } from "lucide-react";
import type { TransferRow, TransferDisposition } from "@/lib/mock-partner";

const DISPOSITION_STYLES: Record<
  TransferDisposition,
  { label: string; chip: string }
> = {
  new: {
    label: "New",
    chip: "border-orange-300 bg-orange-50 text-orange-800",
  },
  contacted: {
    label: "Contacted",
    chip: "border-stone-300 bg-stone-100 text-stone-700",
  },
  quoted: {
    label: "Quoted",
    chip: "border-sky-300 bg-sky-50 text-sky-800",
  },
  won: {
    label: "Won",
    chip: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  lost: {
    label: "Lost",
    chip: "border-stone-300 bg-stone-50 text-stone-600",
  },
  rejected: {
    label: "Rejected",
    chip: "border-red-300 bg-red-50 text-red-700",
  },
};

function TransferCard({ row }: { row: TransferRow }) {
  const disp = DISPOSITION_STYLES[row.disposition];
  const isClosed = row.disposition === "won" || row.disposition === "lost" || row.disposition === "rejected";

  return (
    <li className={`border ${row.disposition === "new" ? "border-orange-300" : "border-line"} bg-surface ${isClosed ? "opacity-80" : ""}`}>
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
              {row.relativeTime}
            </span>
          </div>

          <h3 className="font-display mt-4 text-xl leading-tight text-stone-900">
            {row.carrier.legalName}
          </h3>
          {row.carrier.dba && (
            <p className="text-xs text-stone-500">DBA {row.carrier.dba}</p>
          )}

          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">USDOT</dt>
              <dd className="font-mono text-stone-800">{row.carrier.dotNumber}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">Domicile</dt>
              <dd className="inline-flex items-center gap-1 text-stone-800">
                <MapPin className="h-3 w-3 text-stone-400" />
                {row.carrier.domicile}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">Fleet</dt>
              <dd className="text-stone-800">
                {row.carrier.powerUnits} PU · {row.carrier.drivers} drv
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">Equipment</dt>
              <dd className="inline-flex items-center gap-1 text-stone-800">
                <Truck className="h-3 w-3 text-stone-400" />
                {row.carrier.equipmentClass}
              </dd>
            </div>
            {row.carrier.hazmat && (
              <div className="flex items-center justify-between">
                <dt className="text-stone-500">Hazmat</dt>
                <dd className="font-semibold text-orange-800">Endorsed</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Middle: why they fit + signals */}
        <div className="bg-surface p-5 md:col-span-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Why this carrier fits your spec
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-snug text-stone-700">
            {row.matchCriteria.map((c) => (
              <li key={c} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-orange-600" strokeWidth={3} />
                <span>{c}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Federal-data signals
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {row.signals.map((s) => (
              <div key={s.label} className="border border-line bg-stone-50 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-[0.1em] text-stone-500">
                  {s.label}
                </p>
                <p className="mt-0.5 font-mono text-[13px] text-stone-800">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: contact + actions */}
        <div className="bg-surface p-5 md:col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Contact
          </p>
          <p className="mt-2 text-sm font-medium text-stone-900">
            {row.contact.name}
          </p>
          <a
            href={`tel:${row.contact.phone}`}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-orange-700"
          >
            <Phone className="h-3 w-3" />
            {row.contact.phone}
          </a>
          <a
            href={`mailto:${row.contact.email}`}
            className="mt-1 inline-flex items-center gap-1.5 truncate text-xs text-stone-600 hover:text-orange-700"
          >
            <Mail className="h-3 w-3 flex-none" />
            <span className="truncate">{row.contact.email}</span>
          </a>

          {!isClosed && (
            <div className="mt-5 space-y-1.5">
              <button className="inline-flex w-full items-center justify-center gap-1.5 bg-orange-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700">
                <FileText className="h-3.5 w-3.5" />
                Quote / Reply
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button className="inline-flex items-center justify-center gap-1 border border-line bg-white px-2 py-1.5 text-[11px] text-stone-700 transition-colors hover:border-stone-400">
                  <MessageSquare className="h-3 w-3" />
                  Mark contacted
                </button>
                <button className="inline-flex items-center justify-center gap-1 border border-line bg-white px-2 py-1.5 text-[11px] text-stone-500 transition-colors hover:border-red-300 hover:text-red-700">
                  <X className="h-3 w-3" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {isClosed && (
            <p className="mt-5 text-[11px] uppercase tracking-[0.12em] text-stone-400">
              Disposition logged · attribution counted toward target
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function TransferInbox({ transfers }: { transfers: TransferRow[] }) {
  const newCount = transfers.filter((t) => t.disposition === "new").length;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl text-stone-900">Transfer inbox</h2>
          <p className="mt-1 text-sm text-stone-500">
            {newCount} new · {transfers.length} in window
          </p>
        </div>
        <div className="flex gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
          <button className="border border-line-strong bg-white px-2.5 py-1 text-stone-700">All</button>
          <button className="px-2.5 py-1 hover:text-stone-700">New</button>
          <button className="px-2.5 py-1 hover:text-stone-700">Contacted</button>
          <button className="px-2.5 py-1 hover:text-stone-700">Quoted</button>
          <button className="px-2.5 py-1 hover:text-stone-700">Won</button>
        </div>
      </div>
      <ul className="space-y-3">
        {transfers.map((t) => (
          <TransferCard key={t.id} row={t} />
        ))}
      </ul>
    </div>
  );
}
