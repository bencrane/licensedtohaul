import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import { listTransfersForOrg } from "@/lib/transfers/actions";
import { listThreadPreviewsForOrg } from "@/lib/messages/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Reports · ${slug} — Licensed to Haul` };
}

export default async function ReportsPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const [deals, threads] = await Promise.all([
    listTransfersForOrg(slug),
    listThreadPreviewsForOrg(slug),
  ]);

  const byDisp = deals.reduce<Record<string, number>>((acc, d) => {
    acc[d.disposition] = (acc[d.disposition] ?? 0) + 1;
    return acc;
  }, {});
  const closed = (byDisp.won ?? 0) + (byDisp.lost ?? 0);
  const winRate = closed > 0 ? Math.round(((byDisp.won ?? 0) / closed) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Activity"
        description="Volume, win rate, and conversation depth. More cuts as data accumulates."
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Total deals" value={deals.length} />
            <Stat label="Open" value={(byDisp.new ?? 0) + (byDisp.contacted ?? 0) + (byDisp.quoted ?? 0)} />
            <Stat label="Closed-won" value={byDisp.won ?? 0} hint={closed > 0 ? `win rate ${winRate}%` : "no closed yet"} />
            <Stat label="Conversations" value={threads.length} />
          </div>

          <div className="border border-line bg-surface px-6 py-8">
            <p className="text-sm leading-relaxed text-stone-600">
              Reporting is intentionally minimal during the founding cohort.
              Cohort metrics — funnel conversion, time-to-first-contact,
              average deal age, factor-rate quoted vs. accepted — will arrive
              once the cohort has enough volume to draw signal from.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="border border-line bg-surface px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
