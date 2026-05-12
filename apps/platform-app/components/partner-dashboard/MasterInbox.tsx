import Link from "next/link";
import { MapPin } from "lucide-react";
import type { ThreadPreview } from "@/lib/messages/types";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d`;
  if (hours >= 1) return `${hours}h`;
  if (minutes >= 1) return `${minutes}m`;
  return "now";
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}

type Props = {
  slug: string;
  threads: ThreadPreview[];
  selectedTransferId?: string;
};

export default function MasterInbox({ slug, threads, selectedTransferId }: Props) {
  if (threads.length === 0) {
    return (
      <div className="border border-line bg-surface px-5 py-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
          No conversations yet
        </p>
        <p className="mt-2 text-xs leading-relaxed text-stone-600">
          As you message carriers from a transfer, conversations appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {threads.map((t) => {
        const isPartner = t.last_sender === "partner";
        const isCarrier = t.last_sender === "carrier";
        const hasUnread = t.unread_count > 0;
        const isSelected = t.transfer_id === selectedTransferId;
        return (
          <li key={t.transfer_id}>
            <Link
              href={`/partner/${slug}/transfers?view=messages&conversation=${t.transfer_id}`}
              className={`group flex items-start gap-3 px-4 py-3 transition-colors ${
                isSelected
                  ? "bg-orange-50/70"
                  : "hover:bg-stone-50/60"
              } ${
                hasUnread && !isSelected ? "border-l-2 border-l-orange-500 pl-[14px]" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={`truncate text-sm ${
                      hasUnread ? "font-semibold text-stone-900" : "text-stone-800"
                    }`}
                  >
                    {t.carrier_name}
                  </p>
                  <span className="flex-none font-mono text-[10px] uppercase tracking-[0.12em] text-stone-500">
                    {relativeTime(t.last_at)}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-stone-500">
                  <span className="font-mono">USDOT {t.carrier_usdot}</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5 text-stone-400" />
                    {t.carrier_domicile}
                  </span>
                </div>

                <p
                  className={`mt-1.5 line-clamp-2 text-[12px] leading-snug ${
                    hasUnread ? "text-stone-800" : "text-stone-500"
                  }`}
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-stone-400">
                    {isPartner ? "you:" : isCarrier ? "carrier:" : "system:"}
                  </span>{" "}
                  {truncate(t.last_body, 90)}
                </p>
              </div>

              {hasUnread && (
                <span className="mt-1 inline-flex h-4 min-w-[1rem] flex-none items-center justify-center bg-orange-600 px-1 text-[10px] font-semibold text-white">
                  {t.unread_count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
