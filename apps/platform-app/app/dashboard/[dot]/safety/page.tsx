import { notFound } from "next/navigation";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockDashboard } from "@/lib/mock-dashboard";
import type { HealthStatus, Inspection } from "@/lib/mock-dashboard";

type Props = {
  params: Promise<{ dot: string }>;
};

const BASIC_TONES: Record<HealthStatus, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  alert: "bg-red-500",
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Safety · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function SafetyPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const { safety } = getMockDashboard(cleanDot);

  return (
    <>
      <PageHeader
        eyebrow="Safety"
        title="CSA scores, inspections, crashes."
        description="Your CSA percentiles vs. operating-class peers, plus every roadside inspection and crash on record. Trend arrows compare against your 6-month rolling average."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {safety.lastAudit
                ? `Last audit: ${safety.lastAudit.date} · ${safety.lastAudit.result}`
                : "No audits in last 24 months"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {safety.crashes24mo} crash · {safety.crashesOutOfService} OOS · 24mo
            </span>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* CSA BASICs */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">CSA BASICs</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                Percentile vs. peer carriers
              </span>
            </div>
            <ul className="grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {safety.basics.map((b) => (
                <li key={b.name} className="bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      {b.name}
                    </span>
                    <TrendIcon trend={b.trend} delta={b.trendDelta} />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-3xl text-stone-900">
                      {b.percentile === null ? "—" : b.percentile}
                    </span>
                    <span className="text-xs text-stone-500">
                      {b.percentile === null ? "not rated" : "percentile"}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden bg-stone-100">
                    <div
                      className={`h-full ${BASIC_TONES[b.status]}`}
                      style={{ width: `${b.percentile === null ? 2 : Math.max(2, b.percentile)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Inspections */}
            <div className="lg:col-span-8">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-2xl text-stone-900">
                  Recent inspections
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  {safety.inspectionList.length} in last 24mo · {safety.vehicleOosRate.toFixed(1)}% vehicle OOS
                </span>
              </div>
              <ul className="border border-line bg-surface">
                {safety.inspectionList.map((insp, i) => (
                  <InspectionRow
                    key={insp.id}
                    insp={insp}
                    withBorder={i < safety.inspectionList.length - 1}
                  />
                ))}
              </ul>
            </div>

            {/* Crashes + audit history */}
            <div className="space-y-6 lg:col-span-4">
              <div>
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="font-display text-2xl text-stone-900">Crashes</h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                    24 months
                  </span>
                </div>
                {safety.crashList.length === 0 ? (
                  <div className="border border-line bg-surface p-6 text-center text-sm text-stone-500">
                    No crashes on record.
                  </div>
                ) : (
                  <ul className="border border-line bg-surface">
                    {safety.crashList.map((c, i) => (
                      <li
                        key={c.id}
                        className={`p-5 ${i < safety.crashList.length - 1 ? "border-b border-line" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-mono text-stone-500">{c.date}</p>
                            <p className="font-display mt-1 text-lg text-stone-900 capitalize">
                              {c.severity}
                            </p>
                            <p className="mt-1 text-sm text-stone-700">
                              {c.location}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${c.ooss ? "border-red-200 bg-red-50 text-red-800" : "border-stone-200 bg-stone-50 text-stone-700"}`}>
                            {c.ooss && <AlertTriangle className="h-3 w-3" />}
                            {c.ooss ? "Out-of-service" : "No OOS"}
                          </span>
                        </div>
                        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-stone-500">
                          Report {c.reportNumber}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="font-display mb-4 text-2xl text-stone-900">
                  Audit history
                </h2>
                <div className="border border-line bg-surface p-6 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600" />
                  <p className="mt-3 font-display text-lg text-stone-900">
                    No audits in 24 months.
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Most recent audit: New Entrant Safety Audit, May 2019. Passed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function TrendIcon({ trend, delta }: { trend: "up" | "down" | "flat"; delta: number }) {
  if (trend === "flat") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
        <Minus className="h-3 w-3" />
        flat
      </span>
    );
  }
  const isUp = trend === "up";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-mono ${
        isUp ? "text-amber-700" : "text-emerald-700"
      }`}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}

function InspectionRow({
  insp,
  withBorder,
}: {
  insp: Inspection;
  withBorder: boolean;
}) {
  const totalViol = insp.vehicleViolations + insp.driverViolations;
  return (
    <li
      className={`grid grid-cols-12 items-center gap-3 px-5 py-4 text-sm ${
        withBorder ? "border-b border-line" : ""
      }`}
    >
      <span className="col-span-2 font-mono text-xs text-stone-500">
        {insp.date}
      </span>
      <span className="col-span-1 font-mono text-[11px] uppercase tracking-[0.12em] text-stone-500">
        L{insp.level}
      </span>
      <span className="col-span-4 text-stone-800">{insp.location}</span>
      <span className="col-span-2 font-mono text-xs text-stone-600">
        {insp.unitNumber}
        {insp.driverName ? ` · ${insp.driverName}` : ""}
      </span>
      <span className="col-span-2 text-right font-mono text-xs">
        {totalViol === 0 ? (
          <span className="text-emerald-700">Clean</span>
        ) : (
          <span className="text-amber-700">{totalViol} viol.</span>
        )}
      </span>
      <span className="col-span-1 text-right">
        {insp.ooss ? (
          <span className="inline-flex items-center border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-800">
            OOS
          </span>
        ) : (
          <span className="text-emerald-600">✓</span>
        )}
      </span>
    </li>
  );
}
