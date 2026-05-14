import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Deadline, HealthStatus } from "@/lib/mock-dashboard";

const STATUS_STYLES: Record<
  HealthStatus,
  { dot: string; chip: string; bar: string }
> = {
  good: {
    dot: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    bar: "bg-emerald-500",
  },
  warn: {
    dot: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    bar: "bg-amber-500",
  },
  alert: {
    dot: "bg-red-500",
    chip: "border-red-200 bg-red-50 text-red-800",
    bar: "bg-red-500",
  },
};

export default function NextDeadlines({
  deadlines,
  href = "#",
}: {
  deadlines: Deadline[];
  href?: string;
}) {
  const top = [...deadlines]
    .sort((a, b) => a.daysToDue - b.daysToDue)
    .slice(0, 4);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-2xl text-stone-900">Next deadlines</h2>
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 transition-colors hover:text-orange-800"
        >
          Full compliance hub
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
      <ul className="grid gap-px border border-line bg-line lg:grid-cols-2">
        {top.map((d) => {
          const s = STATUS_STYLES[d.status];
          return (
            <li key={d.id} className="bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  {d.type}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}
                >
                  <span className={`inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {d.daysToDue} days
                </span>
              </div>
              <p className="font-display mt-3 text-lg leading-snug text-stone-900">
                {d.label}
              </p>
              <p className="mt-1 text-xs text-stone-500">Due {d.dueDate}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
