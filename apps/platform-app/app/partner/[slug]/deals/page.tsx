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

export default async function DealsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { view } = await searchParams;
  if (!slug) notFound();

  const activeView = view === "messages" ? "messages" : "deals";

  const [deals, threads] = await Promise.all([
    listTransfersForOrg(slug),
    listThreadPreviewsForOrg(slug),
  ]);

  const newCount = deals.filter((t) => t.disposition === "new").length;
  const totalUnread = threads.reduce((sum, t) => sum + t.unread_count, 0);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Inbox"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {deals.length} deal{deals.length === 1 ? "" : "s"} · {newCount} new
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
        subnav={
          <>
            <TabLink
              href={`/partner/${slug}/deals`}
              active={activeView === "deals"}
              icon={<Inbox className="h-4 w-4" />}
              label="Deals"
              count={deals.length}
            />
            <TabLink
              href={`/partner/${slug}/deals?view=messages`}
              active={activeView === "messages"}
              icon={<MessageSquare className="h-4 w-4" />}
              label="Conversations"
              count={threads.length}
              badge={totalUnread > 0 ? totalUnread : undefined}
            />
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          {activeView === "messages" ? (
            <MasterInbox slug={slug} threads={threads} />
          ) : (
            <TransferInbox slug={slug} transfers={deals} />
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
