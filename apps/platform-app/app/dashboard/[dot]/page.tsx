import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import IdentityStrip from "@/components/dashboard/IdentityStrip";
import HealthRow from "@/components/dashboard/HealthRow";
import EventFeed from "@/components/dashboard/EventFeed";
import NextDeadlines from "@/components/dashboard/NextDeadlines";
import ActionShortcuts from "@/components/dashboard/ActionShortcuts";
import { getDashboard } from "@/lib/dashboard-fetch";

type Props = {
  params: Promise<{ dot: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  return {
    title: `USDOT ${cleanDot} · Dashboard — Licensed to Haul`,
    description: "Your live FMCSA authority profile and recent activity.",
  };
}

export default async function DashboardPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot || cleanDot.length < 3) notFound();

  const data = await getDashboard(cleanDot);
  const recentFeed = data.feed.slice(0, 4);

  return (
    <>
      <IdentityStrip carrier={data.carrier} />
      <HealthRow
        mcs150={data.mcs150}
        insurance={data.insurance}
        worstBasic={data.worstBasic}
        safety={data.safety}
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-12">
          <NextDeadlines
            deadlines={data.deadlines}
            href={`/dashboard/${cleanDot}/compliance`}
          />

          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">
                What's new
              </h2>
              <Link
                href={`/dashboard/${cleanDot}/inbox`}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 transition-colors hover:text-orange-800"
              >
                Full inbox
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <EventFeed events={recentFeed} hideHeader />
          </div>
        </div>
      </section>

      <ActionShortcuts />
    </>
  );
}
