import Link from "next/link";
import {
  ClipboardCheck,
  Truck,
  Shield,
  Wallet,
  Cog,
  Activity,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import type { FeedEvent } from "@/lib/mock-dashboard";

const CATEGORY_STYLES: Record<
  FeedEvent["category"],
  { icon: React.ReactNode; label: string; chip: string }
> = {
  compliance: {
    icon: <ClipboardCheck className="h-3.5 w-3.5" />,
    label: "Compliance",
    chip: "bg-orange-50 text-orange-800 border-orange-200",
  },
  freight: {
    icon: <Truck className="h-3.5 w-3.5" />,
    label: "Freight",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  insurance: {
    icon: <Shield className="h-3.5 w-3.5" />,
    label: "Insurance",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
  },
  financing: {
    icon: <Wallet className="h-3.5 w-3.5" />,
    label: "Financing",
    chip: "bg-violet-50 text-violet-800 border-violet-200",
  },
  equipment: {
    icon: <Cog className="h-3.5 w-3.5" />,
    label: "Equipment",
    chip: "bg-stone-100 text-stone-700 border-line-strong",
  },
  safety: {
    icon: <Activity className="h-3.5 w-3.5" />,
    label: "Safety",
    chip: "bg-stone-100 text-stone-700 border-line-strong",
  },
  authority: {
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
    label: "Authority",
    chip: "bg-stone-100 text-stone-700 border-line-strong",
  },
};

function EventCard({ event }: { event: FeedEvent }) {
  const style = CATEGORY_STYLES[event.category];

  return (
    <li className="border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${style.chip}`}
        >
          {style.icon}
          {style.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
          {event.relativeTime}
        </span>
      </div>

      <h3 className="font-display mt-4 text-lg leading-snug text-stone-900">
        {event.title}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
        {event.body}
      </p>

      {(event.primaryAction || event.secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {event.primaryAction && (
            <Link
              href={event.primaryAction.href}
              className="inline-flex items-center gap-1.5 bg-orange-600 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700"
            >
              {event.primaryAction.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          {event.secondaryAction && (
            <Link
              href={event.secondaryAction.href}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              {event.secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

export default function EventFeed({
  events,
  hideHeader = false,
}: {
  events: FeedEvent[];
  hideHeader?: boolean;
}) {
  return (
    <div>
      {!hideHeader && (
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl text-stone-900">What's new</h2>
          <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            <button className="border border-line-strong bg-white px-2.5 py-1 text-stone-700">
              All
            </button>
            <button className="px-2.5 py-1 hover:text-stone-700">Compliance</button>
            <button className="px-2.5 py-1 hover:text-stone-700">Quotes</button>
          </div>
        </div>
      )}
      <ul className="space-y-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </ul>
    </div>
  );
}
