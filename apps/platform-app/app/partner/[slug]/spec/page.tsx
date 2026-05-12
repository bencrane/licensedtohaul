import { notFound } from "next/navigation";
import { Lock, AlertTriangle, Sliders, History } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockPartner } from "@/lib/mock-partner";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Locked spec · ${slug} — Licensed to Haul` };
}

export default async function SpecPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const data = getMockPartner(slug);
  const { spec, driftBreakdown } = data;

  return (
    <>
      <PageHeader
        eyebrow="Locked spec"
        title="The carrier criteria you locked at compose time."
        description="Your spec is exclusive. No other partner in your vertical works the same locked audience. Adjustments to spec criteria require re-confirmation against your delivery commitment."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Lock className="h-3.5 w-3.5 text-stone-400" />
              Composed {spec.composedAt}
            </span>
            <span className="inline-flex items-center gap-1.5">
              Live audience · {spec.audienceSizeNow.toLocaleString()} carriers
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              {spec.audienceDriftNet >= 0 ? "+" : ""}
              {spec.audienceDriftNet} since lock
            </span>
          </>
        }
        actions={
          <button className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700">
            <Sliders className="h-4 w-4" />
            Adjust spec
          </button>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Spec criteria */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">Criteria</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                {spec.criteria.length} active filters
              </span>
            </div>
            <ul className="grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
              {spec.criteria.map((c) => (
                <li key={c.label} className="bg-surface p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    {c.label}
                  </p>
                  <p className="font-display mt-2 text-base text-stone-900">
                    {c.value}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Audience size + drift */}
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="border border-line bg-surface p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Live audience size
                </p>
                <div className="mt-3 flex items-baseline gap-3">
                  <p className="font-display text-5xl text-stone-900">
                    {spec.audienceSizeNow.toLocaleString()}
                  </p>
                  <span className="font-mono text-sm text-emerald-700">
                    {spec.audienceDriftNet >= 0 ? "+" : ""}
                    {spec.audienceDriftNet}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  carriers in your locked audience right now (started at{" "}
                  {spec.audienceSizeAtCompose.toLocaleString()} at compose)
                </p>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Drift breakdown
                  </p>
                  <ul className="mt-3 space-y-2">
                    {driftBreakdown.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm text-stone-800">{d.label}</p>
                          <p className="text-xs text-stone-500">{d.reason}</p>
                        </div>
                        <span
                          className={`font-mono text-sm ${d.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}
                        >
                          {d.delta >= 0 ? "+" : ""}
                          {d.delta}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="border border-amber-200 bg-amber-50/60 p-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-8 w-8 flex-none items-center justify-center bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg text-stone-900">
                      Adjustments impact your contract
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-700">
                      Spec criteria changes shift your locked audience. If the
                      adjusted audience differs by more than 10% from the
                      original lock, the change triggers a contract amendment
                      to keep your committed transfer count and refund-or-rollover
                      SLA aligned.
                    </p>
                    <p className="mt-4 text-xs text-stone-600">
                      Direct line to the engineering team for spec questions:{" "}
                      <a className="font-medium text-orange-700 hover:text-orange-800" href="mailto:partners@licensedtohaul.com">
                        partners@licensedtohaul.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">Spec history</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                1 entry
              </span>
            </div>
            <ul className="border border-line bg-surface">
              <li className="grid grid-cols-12 items-center gap-3 px-5 py-4">
                <span className="col-span-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  <History className="h-3 w-3" />
                  Composed
                </span>
                <span className="col-span-4 text-sm text-stone-800">
                  {spec.composedAt}
                </span>
                <span className="col-span-4 text-sm text-stone-700">
                  Initial spec lock · 8 criteria · {spec.audienceSizeAtCompose.toLocaleString()} carriers
                </span>
                <span className="col-span-2 text-right">
                  <span className="inline-flex items-center border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                    Active
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
