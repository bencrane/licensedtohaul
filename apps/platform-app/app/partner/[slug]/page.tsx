import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, Inbox, ListChecks } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { listTransfersForOrg } from "@/lib/transfers/actions";
import { listThreadPreviewsForOrg } from "@/lib/messages/actions";
import { getFactorProfileBySlug } from "@/lib/factor-profiles/actions";
import { pool } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `${slug} · Overview — Licensed to Haul` };
}

async function getOrgName(slug: string): Promise<string | null> {
  const { rows } = await pool().query<{ name: string }>(
    "SELECT name FROM lth.organizations WHERE slug = $1 AND category = 'factoring'",
    [slug],
  );
  return rows[0]?.name ?? null;
}

export default async function PartnerOverviewPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const [name, deals, threads, profile] = await Promise.all([
    getOrgName(slug),
    listTransfersForOrg(slug),
    listThreadPreviewsForOrg(slug),
    getFactorProfileBySlug(slug),
  ]);

  if (!name) notFound();

  const openCount = deals.filter((d) =>
    ["new", "contacted", "quoted"].includes(d.disposition),
  ).length;
  const wonCount = deals.filter((d) => d.disposition === "won").length;
  const unread = threads.reduce((s, t) => s + t.unread_count, 0);
  const profileComplete = !!(
    profile && profile.criteria.states.length > 0 && profile.display_copy
  );

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={name}
        description="Factoring partner on Licensed to Haul."
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {!profileComplete && (
            <div className="border border-orange-300 bg-orange-50 px-5 py-4">
              <p className="text-sm font-semibold text-orange-900">
                Finish your factor profile
              </p>
              <p className="mt-1 text-sm text-orange-800">
                Carriers see your profile on their financing page. Set the
                states you serve, your terms, and the copy carriers read before
                they request a quote.
              </p>
              <Link
                href={`/partner/${slug}/profile`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-900 hover:text-orange-700"
              >
                Open profile
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Open deals"
              value={openCount}
              hint={`${deals.length} total all-time`}
              href={`/partner/${slug}/deals`}
              icon={<Inbox className="h-4 w-4" />}
            />
            <StatTile
              label="Conversations"
              value={threads.length}
              hint={unread > 0 ? `${unread} unread` : "all caught up"}
              href={`/partner/${slug}/deals?view=messages`}
              icon={<ListChecks className="h-4 w-4" />}
            />
            <StatTile
              label="Closed-won"
              value={wonCount}
              hint="all-time"
              href={`/partner/${slug}/pipeline`}
              icon={<ClipboardList className="h-4 w-4" />}
            />
          </div>

          <div className="border border-line bg-surface p-6">
            <h2 className="font-display text-xl text-stone-900">Quick links</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <QuickLink
                href={`/partner/${slug}/profile`}
                title="Factor profile"
                desc="Edit who you factor, your terms, and what carriers see."
              />
              <QuickLink
                href={`/partner/${slug}/deals`}
                title="Inbox"
                desc="Incoming carrier deals and active conversations."
              />
              <QuickLink
                href={`/partner/${slug}/pipeline`}
                title="Pipeline"
                desc="Move deals through new → contacted → quoted → won/lost."
              />
              <QuickLink
                href={`/partner/${slug}/team`}
                title="Team"
                desc="Manage seats and roles."
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function StatTile({
  label,
  value,
  hint,
  href,
  icon,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block border border-line bg-surface px-5 py-4 transition-colors hover:border-orange-400"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {label}
        </p>
        <span className="text-stone-400 group-hover:text-orange-600">{icon}</span>
      </div>
      <p className="mt-2 font-display text-3xl text-stone-900">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group block border border-line bg-white px-4 py-3 transition-colors hover:border-orange-400"
    >
      <p className="font-semibold text-stone-900 group-hover:text-orange-700">
        {title}
      </p>
      <p className="mt-0.5 text-sm text-stone-600">{desc}</p>
    </Link>
  );
}
