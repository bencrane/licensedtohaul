import { notFound } from "next/navigation";
import { Download, TrendingUp } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockPartner } from "@/lib/mock-partner";

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
  const data = getMockPartner(slug);
  const { weeklyDeliveries, winRateTrend, agreement, projectedFinalDelivery, dispositions } = data;

  const closed = dispositions.won + dispositions.lost;
  const overallWinRate = closed > 0 ? Math.round((dispositions.won / closed) * 100) : 0;
  const maxDelivered = Math.max(...weeklyDeliveries.map((w) => w.delivered), 10);

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Delivery pace, win rate, and renewal forecast."
        description="The data you need for the renewal decision. Weekly cadence, conversion trends, and the projection toward your locked target."
        actions={
          <>
            <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700">
              <Download className="h-4 w-4" />
              Monthly PDF
            </button>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Summary tiles */}
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              label="Transfers delivered"
              value={`${agreement.transfersDelivered}`}
              detail={`of ${agreement.transferTarget} target`}
            />
            <SummaryTile
              label="Projected end-of-window"
              value={`${projectedFinalDelivery}`}
              detail={`${projectedFinalDelivery - agreement.transferTarget >= 0 ? "+" : ""}${projectedFinalDelivery - agreement.transferTarget} vs. target`}
            />
            <SummaryTile
              label="Win rate"
              value={`${overallWinRate}%`}
              detail={`${dispositions.won} won of ${closed} closed`}
            />
            <SummaryTile
              label="Avg weekly pace"
              value={(agreement.transfersDelivered / Math.max(1, Math.floor(agreement.daysElapsed / 7))).toFixed(1)}
              detail="transfers per week, rolling"
            />
          </div>

          {/* Weekly delivery chart */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl text-stone-900">
                  Weekly delivery
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Bars = transfers delivered. Dashed line = pace target to hit 80 in 90 days.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                {weeklyDeliveries.length} weeks
              </span>
            </div>
            <div className="border border-line bg-surface p-6">
              <div className="flex h-56 items-end gap-2">
                {weeklyDeliveries.map((w) => {
                  const hPct = (w.delivered / maxDelivered) * 100;
                  const targetPct = (w.paceTarget / maxDelivered) * 100;
                  const onPace = w.delivered >= w.paceTarget;
                  return (
                    <div key={w.weekLabel} className="relative flex flex-1 flex-col items-center">
                      <div className="relative flex h-full w-full items-end justify-center">
                        <div
                          className={`relative w-3/4 ${onPace ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ height: `${hPct}%` }}
                        >
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-stone-700">
                            {w.delivered}
                          </span>
                        </div>
                        <div
                          className="absolute left-0 right-0 border-t border-dashed border-stone-400"
                          style={{ bottom: `${targetPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-[10px] font-mono uppercase tracking-[0.1em] text-stone-500">
                {weeklyDeliveries.map((w) => (
                  <div key={w.weekLabel} className="flex-1 text-center">
                    {w.weekLabel.replace(/\([^)]+\)/, "").trim()}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Win rate trend */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl text-stone-900">
                  Win rate trend
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Closed wins / (wins + losses), by week.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                <TrendingUp className="h-4 w-4" />
                Trending up
              </span>
            </div>
            <div className="border border-line bg-surface p-6">
              <div className="relative h-48">
                <svg
                  viewBox={`0 0 ${winRateTrend.length * 60} 200`}
                  className="h-full w-full"
                  preserveAspectRatio="none"
                >
                  {/* gridlines */}
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      x2={winRateTrend.length * 60}
                      y1={200 - (y / 100) * 200}
                      y2={200 - (y / 100) * 200}
                      stroke="#e7dfc9"
                      strokeWidth="1"
                    />
                  ))}
                  {/* line */}
                  <polyline
                    points={winRateTrend
                      .map((p, i) => `${i * 60 + 30},${200 - (p.winRatePct / 100) * 200}`)
                      .join(" ")}
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                  />
                  {/* dots */}
                  {winRateTrend.map((p, i) => (
                    <circle
                      key={i}
                      cx={i * 60 + 30}
                      cy={200 - (p.winRatePct / 100) * 200}
                      r="3.5"
                      fill="#ea580c"
                    />
                  ))}
                </svg>
                <div className="absolute left-0 top-0 flex h-full w-8 flex-col justify-between font-mono text-[10px] text-stone-400">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>25</span>
                  <span>0</span>
                </div>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 pl-8 text-[10px] font-mono uppercase tracking-[0.1em] text-stone-500">
                {winRateTrend.map((p) => (
                  <div key={p.weekLabel} className="flex-1 text-center">
                    {p.weekLabel.split(" ")[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SummaryTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="font-display mt-2 text-3xl text-stone-900">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}
