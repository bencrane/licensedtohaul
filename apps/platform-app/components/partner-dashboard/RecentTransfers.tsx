import Link from "next/link";
import { ArrowUpRight, ArrowRight, Truck } from "lucide-react";
import type { TransferRow, TransferDisposition } from "@/lib/mock-partner";

const DISPOSITION_STYLES: Record<
  TransferDisposition,
  { label: string; chip: string }
> = {
  new: { label: "New", chip: "border-orange-300 bg-orange-50 text-orange-800" },
  contacted: { label: "Contacted", chip: "border-stone-300 bg-stone-100 text-stone-700" },
  quoted: { label: "Quoted", chip: "border-sky-300 bg-sky-50 text-sky-800" },
  won: { label: "Won", chip: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  lost: { label: "Lost", chip: "border-stone-300 bg-stone-50 text-stone-600" },
  rejected: { label: "Rejected", chip: "border-red-300 bg-red-50 text-red-700" },
};

type Props = {
  transfers: TransferRow[];
  href: string;
  limit?: number;
};

export default function RecentTransfers({ transfers, href, limit = 4 }: Props) {
  const visible = transfers.slice(0, limit);
  const newCount = transfers.filter((t) => t.disposition === "new").length;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl text-stone-900">Recent transfers</h2>
          <p className="mt-1 text-sm text-stone-500">
            {newCount} new · {transfers.length} in window
          </p>
        </div>
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 transition-colors hover:text-orange-800"
        >
          Full transfer inbox
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <ul className="border border-line bg-surface">
        {visible.map((t, i) => {
          const disp = DISPOSITION_STYLES[t.disposition];
          return (
            <li
              key={t.id}
              className={`grid grid-cols-12 items-center gap-3 px-5 py-4 ${
                i < visible.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span
                className={`col-span-2 inline-flex w-fit items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${disp.chip}`}
              >
                {t.disposition === "new" && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
                  </span>
                )}
                {disp.label}
              </span>
              <div className="col-span-5">
                <p className="font-display text-base leading-snug text-stone-900">
                  {t.carrier.legalName}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  USDOT {t.carrier.dotNumber} · {t.carrier.domicile}
                </p>
              </div>
              <div className="col-span-3 text-xs">
                <p className="inline-flex items-center gap-1.5 text-stone-700">
                  <Truck className="h-3 w-3 text-stone-400" />
                  {t.carrier.equipmentClass} · {t.carrier.powerUnits} PU
                </p>
                <p className="mt-1 font-mono text-stone-500">{t.relativeTime}</p>
              </div>
              <div className="col-span-2 text-right">
                <Link
                  href={`${href}#${t.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 transition-colors hover:text-orange-800"
                >
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
