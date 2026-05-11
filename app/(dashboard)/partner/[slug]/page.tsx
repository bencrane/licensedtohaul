import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PartnerIdentityStrip from "@/components/partner-dashboard/PartnerIdentityStrip";
import PartnerKpiRow from "@/components/partner-dashboard/PartnerKpiRow";
import RecentTransfers from "@/components/partner-dashboard/RecentTransfers";
import RecentActivity from "@/components/partner-dashboard/RecentActivity";
import PartnerActionShortcuts from "@/components/partner-dashboard/PartnerActionShortcuts";
import { getMockPartner } from "@/lib/mock-partner";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = getMockPartner(slug);
  return {
    title: `${data.partner.shortName} · Overview — Licensed to Haul`,
  };
}

export default async function PartnerOverviewPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const data = getMockPartner(slug);
  const recentActivity = data.activity.slice(0, 4);

  return (
    <>
      <PartnerIdentityStrip partner={data.partner} agreement={data.agreement} />
      <PartnerKpiRow
        agreement={data.agreement}
        spec={data.spec}
        awaitingAction={data.awaitingAction}
        deliveryStatus={data.deliveryStatus}
        projectedFinalDelivery={data.projectedFinalDelivery}
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-12 px-6 py-8">
          <RecentTransfers
            transfers={data.transfers}
            href={`/partner/${slug}/transfers`}
          />

          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">Recent activity</h2>
              <Link
                href={`/partner/${slug}/pipeline`}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 transition-colors hover:text-orange-800"
              >
                Open pipeline
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <RecentActivity events={recentActivity} hideHeader />
          </div>
        </div>
      </section>

      <PartnerActionShortcuts />
    </>
  );
}
