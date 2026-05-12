import { Inbox, Trophy, TrendingUp, CircleCheck } from "lucide-react";
import type { ActivityEvent } from "@/lib/mock-partner";

const CATEGORY_STYLES: Record<
  ActivityEvent["category"],
  { icon: React.ReactNode; label: string; chip: string }
> = {
  transfer: {
    icon: <Inbox className="h-3.5 w-3.5" />,
    label: "Transfer",
    chip: "bg-orange-50 text-orange-800 border-orange-200",
  },
  milestone: {
    icon: <Trophy className="h-3.5 w-3.5" />,
    label: "Milestone",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  drift: {
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    label: "Audience",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
  },
  disposition: {
    icon: <CircleCheck className="h-3.5 w-3.5" />,
    label: "Your team",
    chip: "bg-stone-100 text-stone-700 border-line-strong",
  },
};

export default function RecentActivity({
  events,
  hideHeader = false,
}: {
  events: ActivityEvent[];
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <>
          <h2 className="font-display text-2xl text-stone-900">Recent activity</h2>
          <p className="mt-1 mb-5 text-sm text-stone-500">
            Transfers, audience changes, milestones, and your team's dispositions.
          </p>
        </>
      )}
      <ul className="border border-line bg-surface">
        {events.map((e, i) => {
          const style = CATEGORY_STYLES[e.category];
          return (
            <li
              key={e.id}
              className={`px-5 py-4 ${i < events.length - 1 ? "border-b border-line" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${style.chip}`}
                >
                  {style.icon}
                  {style.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  {e.relativeTime}
                </span>
              </div>
              <h3 className="font-display mt-2 text-base leading-snug text-stone-900">
                {e.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                {e.body}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
