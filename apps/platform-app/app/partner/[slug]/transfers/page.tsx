import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox, MessageSquare } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import TransferInbox from "@/components/partner-dashboard/TransferInbox";
import MasterInbox from "@/components/partner-dashboard/MasterInbox";
import { listTransfersForOrg } from "@/lib/transfers/actions";
import { listThreadPreviewsForOrg } from "@/lib/messages/actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Inbox · ${slug} — Licensed to Haul` };
}

export default async function TransfersPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { view } = await searchParams;
  if (!slug) notFound();

  const activeView = view === "messages" ? "messages" : "transfers";

  // Fetch both in parallel — we render counts in the tab labels regardless of active view.
  const [transfers, threads] = await Promise.all([
    listTransfersForOrg(slug),
    listThreadPreviewsForOrg(slug),
  ]);

  const newCount = transfers.filter((t) => t.disposition === "new").length;
  const totalUnread = threads.reduce((sum, t) => sum + t.unread_count, 0);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Inbox"
        description="Every carrier your active specs have delivered, and every conversation you've opened with them."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {transfers.length} transfers · {newCount} new
            </span>
            <span className="inline-flex items-center gap-1.5">
              {threads.length} conversation{threads.length === 1 ? "" : "s"}
              {totalUnread > 0 && (
                <span className="ml-1 font-semibold text-orange-700">
                  · {totalUnread} unread
                </span>
              )}
            </span>
          </>
        }
      />

      {/* Tab bar */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1400px] gap-1 px-6">
          <TabLink
            href={`/partner/${slug}/transfers`}
            active={activeView === "transfers"}
            icon={<Inbox className="h-4 w-4" />}
            label="Transfers"
            count={transfers.length}
          />
          <TabLink
            href={`/partner/${slug}/transfers?view=messages`}
            active={activeView === "messages"}
            icon={<MessageSquare className="h-4 w-4" />}
            label="Master inbox"
            count={threads.length}
            badge={totalUnread > 0 ? totalUnread : undefined}
          />
        </div>
      </div>

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          {activeView === "messages" ? (
            <MasterInbox slug={slug} threads={threads} />
          ) : (
            <TransferInbox slug={slug} transfers={transfers} />
          )}
        </div>
      </section>
    </>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
  count,
  badge,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-orange-600 text-orange-700"
          : "border-transparent text-stone-600 hover:text-stone-900"
      }`}
    >
      <span className={active ? "text-orange-600" : "text-stone-400 group-hover:text-stone-600"}>
        {icon}
      </span>
      {label}
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
          active ? "text-orange-600" : "text-stone-400"
        }`}
      >
        {count}
      </span>
      {badge !== undefined && (
        <span className="inline-flex h-4 min-w-[1rem] items-center justify-center bg-orange-600 px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
