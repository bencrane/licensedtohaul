import { notFound } from "next/navigation";
import { ArrowRight, Truck } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockPartner } from "@/lib/mock-partner";
import type { TransferDisposition, TransferRow } from "@/lib/mock-partner";

type Props = {
  params: Promise<{ slug: string }>;
};

type Column = {
  key: TransferDisposition;
  label: string;
  accent: string;
  count: number;
  cards: TransferRow[];
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Pipeline · ${slug} — Licensed to Haul` };
}

export default async function PipelinePage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const data = getMockPartner(slug);

  // Real cards we have (8), padded with disposition counts for visual fidelity.
  const cards = data.transfers;
  const closed = data.dispositions.won + data.dispositions.lost;
  const winRate = closed > 0 ? Math.round((data.dispositions.won / closed) * 100) : 0;

  const columns: Column[] = [
    {
      key: "new",
      label: "New",
      accent: "border-t-orange-500",
      count: data.dispositions.new,
      cards: cards.filter((c) => c.disposition === "new"),
    },
    {
      key: "contacted",
      label: "Contacted",
      accent: "border-t-stone-400",
      count: data.dispositions.contacted,
      cards: cards.filter((c) => c.disposition === "contacted"),
    },
    {
      key: "quoted",
      label: "Quoted",
      accent: "border-t-sky-500",
      count: data.dispositions.quoted,
      cards: cards.filter((c) => c.disposition === "quoted"),
    },
    {
      key: "won",
      label: "Won",
      accent: "border-t-emerald-500",
      count: data.dispositions.won,
      cards: cards.filter((c) => c.disposition === "won"),
    },
    {
      key: "lost",
      label: "Lost",
      accent: "border-t-stone-300",
      count: data.dispositions.lost,
      cards: cards.filter((c) => c.disposition === "lost"),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="Your team's pipeline."
        description="Every transfer your team is moving forward, by disposition. Drag a card across columns to update status. Owner assignment and follow-up reminders live on each card."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {data.dispositions.new + data.dispositions.contacted + data.dispositions.quoted} open · {closed} closed
            </span>
            <span className="inline-flex items-center gap-1.5">
              Win rate {winRate}% (closed)
            </span>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="grid gap-4 overflow-x-auto md:grid-cols-5">
            {columns.map((col) => (
              <div
                key={col.key}
                className={`flex flex-col border border-t-4 border-line ${col.accent} bg-stone-50/60`}
              >
                <header className="border-b border-line bg-white px-3 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                      {col.label}
                    </p>
                    <span className="font-mono text-xs text-stone-700">
                      {col.count}
                    </span>
                  </div>
                </header>
                <ul className="flex flex-col gap-2 p-2">
                  {col.cards.map((c) => (
                    <li
                      key={c.id}
                      className="cursor-grab border border-line bg-white p-3 text-left text-xs shadow-[0_1px_0_rgba(26,20,16,0.04)] transition-colors hover:border-orange-300"
                    >
                      <p className="font-display text-[15px] leading-snug text-stone-900">
                        {c.carrier.legalName}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-stone-500">
                        USDOT {c.carrier.dotNumber}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1 text-stone-600">
                        <Truck className="h-3 w-3 text-stone-400" />
                        {c.carrier.equipmentClass} · {c.carrier.powerUnits} PU
                      </p>
                      <p className="mt-2 text-stone-500">{c.carrier.domicile}</p>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400">
                        <span className="font-mono uppercase tracking-[0.12em]">
                          {c.relativeTime}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </li>
                  ))}
                  {col.cards.length < col.count && (
                    <li className="border border-dashed border-line bg-stone-50/40 px-3 py-2 text-center text-[11px] text-stone-500">
                      + {col.count - col.cards.length} more in {col.label.toLowerCase()}
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
