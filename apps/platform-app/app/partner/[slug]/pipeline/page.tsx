import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import PipelineBoard from "@/components/partner-dashboard/PipelineBoard";
import { listTransfersForOrg } from "@/lib/transfers/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Pipeline · ${slug} — Licensed to Haul` };
}

export default async function PipelinePage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const transfers = await listTransfersForOrg(slug);

  const counts = transfers.reduce(
    (acc, t) => {
      acc[t.disposition] = (acc[t.disposition] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const open = (counts.new ?? 0) + (counts.contacted ?? 0) + (counts.quoted ?? 0);
  const closed = (counts.won ?? 0) + (counts.lost ?? 0) + (counts.rejected ?? 0);
  const winRate =
    counts.won && closed > 0 ? Math.round((counts.won / closed) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Pipeline"
        description="Every transfer your team is moving forward, by disposition. Drag a card across columns to update status."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {open} open · {closed} closed
            </span>
            {closed > 0 && (
              <span className="inline-flex items-center gap-1.5">
                Win rate {winRate}%
              </span>
            )}
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          {transfers.length === 0 ? (
            <div className="mx-auto max-w-md border border-line bg-surface px-7 py-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
                No transfers yet
              </p>
              <h2 className="font-display mt-1.5 text-xl text-stone-900">
                Pipeline is empty.
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-stone-600">
                When carriers match your active specs, they appear here for
                your team to work.
              </p>
            </div>
          ) : (
            <PipelineBoard slug={slug} initialTransfers={transfers} />
          )}
        </div>
      </section>
    </>
  );
}
