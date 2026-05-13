import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import type { ThreadPreview } from "@/lib/messages/types";

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

function truncate(s: string, n = 140): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}

type Props = {
  slug: string;
  threads: ThreadPreview[];
};

export default function MasterInbox({ slug, threads }: Props) {
  if (threads.length === 0) {
    return (
      <div className="mx-auto max-w-md border border-line bg-surface px-7 py-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
          No conversations yet
        </p>
        <h2 className="font-display mt-1.5 text-xl text-stone-900">
          Master inbox is empty.
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-stone-600">
          As you message carriers from a transfer detail page, conversations
          appear here ordered by most recent activity.
        </p>
      </div>
    );
  }

  const totalUnread = threads.reduce((sum, t) => sum + t.unread_count, 0);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl text-stone-900">Master inbox</h2>
          <p className="mt-1 text-sm text-stone-500">
            {threads.length} conversation{threads.length === 1 ? "" : "s"}
            {totalUnread > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-orange-700">
                  {totalUnread} unread from carriers
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-line border border-line bg-surface">
        {threads.map((t) => {
          const isPartner = t.last_sender === "partner";
          const isCarrier = t.last_sender === "carrier";
          const hasUnread = t.unread_count > 0;
          return (
            <li key={t.transfer_id}>
              <Link
                href={`/partner/${slug}/deals/${t.transfer_id}`}
                className={`group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-stone-50/60 ${
                  hasUnread ? "border-l-2 border-l-orange-500 pl-[18px]" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className={`truncate text-[15px] ${
                        hasUnread
                          ? "font-semibold text-stone-900"
                          : "text-stone-800"
                      }`}
                    >
                      {t.carrier_name}
                    </p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone-500">
                      {relativeTime(t.last_at)}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-stone-500">
                    <span className="font-mono">USDOT {t.carrier_usdot}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-stone-400" />
                      {t.carrier_domicile}
                    </span>
                    <span className="font-mono uppercase tracking-[0.08em]">
                      {t.disposition}
                    </span>
                  </div>

                  <p
                    className={`mt-2 line-clamp-2 text-[13px] leading-snug ${
                      hasUnread ? "text-stone-800" : "text-stone-500"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-stone-400">
                      {isPartner ? "you" : isCarrier ? t.carrier_name : "system"}
                    </span>{" "}
                    {truncate(t.last_body)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 pt-1">
                  {hasUnread && (
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
                      {t.unread_count}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-stone-300 transition-colors group-hover:text-orange-600" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
