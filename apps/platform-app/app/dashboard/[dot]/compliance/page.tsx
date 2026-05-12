import { notFound } from "next/navigation";
import { ArrowRight, ClipboardCheck, FileText } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockDashboard } from "@/lib/mock-dashboard";
import type { HealthStatus, Filing } from "@/lib/mock-dashboard";

type Props = {
  params: Promise<{ dot: string }>;
};

const STATUS_STYLES: Record<HealthStatus, { dot: string; chip: string }> = {
  good: { dot: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  warn: { dot: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-800" },
  alert: { dot: "bg-red-500", chip: "border-red-200 bg-red-50 text-red-800" },
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Compliance · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function CompliancePage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const data = getMockDashboard(cleanDot);
  const sortedDeadlines = [...data.deadlines].sort(
    (a, b) => a.daysToDue - b.daysToDue,
  );

  return (
    <>
      <PageHeader
        eyebrow="Compliance"
        title="Filings, deadlines, and audit prep."
        description="Every filing pegged to your authority's actual cadence. Reminders fire on the same schedule the FMCSA grades you against."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5 text-stone-400" />
              {data.compliance.filings.length} filings on file
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              No missed filings in the last 24 months
            </span>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Upcoming deadlines timeline */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">
                Upcoming deadlines
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                Next 240 days
              </span>
            </div>
            <ol className="border border-line bg-surface">
              {sortedDeadlines.map((d, i) => {
                const s = STATUS_STYLES[d.status];
                return (
                  <li
                    key={d.id}
                    className={`grid grid-cols-12 items-center gap-3 px-5 py-4 ${
                      i < sortedDeadlines.length - 1 ? "border-b border-line" : ""
                    }`}
                  >
                    <div className="col-span-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                        {d.type}
                      </p>
                    </div>
                    <div className="col-span-5">
                      <p className="font-display text-base text-stone-900">{d.label}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="font-mono text-sm text-stone-800">{d.dueDate}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}
                      >
                        <span className={`inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {d.daysToDue} days
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <button className="text-stone-400 transition-colors hover:text-orange-700">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Filing tracker grid */}
          <div>
            <h2 className="font-display mb-4 text-2xl text-stone-900">
              Filing tracker
            </h2>
            <div className="grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
              <FilingTile
                title="MCS-150"
                statusLabel="Filed"
                lastFiled={data.compliance.mcs150.filedAt}
                nextDue={data.compliance.mcs150.nextDue}
                detail="Biennial update of carrier registration"
                status="good"
              />
              <FilingTile
                title="IFTA"
                statusLabel="Q1 due Apr 30"
                lastFiled={data.compliance.ifta.lastFiled}
                nextDue={data.compliance.ifta.due}
                detail={`${data.compliance.ifta.quarter} fuel-tax filing`}
                status="warn"
              />
              <FilingTile
                title="IRP"
                statusLabel="Active"
                lastFiled={`${data.compliance.irp.jurisdictions} jurisdictions`}
                nextDue={data.compliance.irp.renewalDue}
                detail="International Registration Plan apportioned plate"
                status="good"
              />
              <FilingTile
                title="D&A consortium"
                statusLabel={
                  data.compliance.daConsortium.status === "enrolled"
                    ? "Enrolled"
                    : "Action needed"
                }
                lastFiled={`Last query ${data.compliance.daConsortium.lastQuery}`}
                nextDue={`Enrolled ${data.compliance.daConsortium.enrolledDate}`}
                detail={data.compliance.daConsortium.name}
                status={
                  data.compliance.daConsortium.status === "enrolled" ? "good" : "alert"
                }
              />
              <FilingTile
                title="BOC-3"
                statusLabel="On file"
                lastFiled={data.compliance.boc3.filedDate ?? "—"}
                nextDue="No expiration"
                detail={data.compliance.boc3.agent ?? "—"}
                status="good"
              />
              <FilingTile
                title="UCR"
                statusLabel={
                  data.compliance.ucr.status === "filed"
                    ? `Filed ${data.compliance.ucr.year}`
                    : "Pending"
                }
                lastFiled={data.compliance.ucr.filedDate ?? "—"}
                nextDue="Annual renewal"
                detail="Unified Carrier Registration"
                status={data.compliance.ucr.status === "filed" ? "good" : "warn"}
              />
            </div>
          </div>

          {/* Filing history */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">Recent filings</h2>
              <button className="text-sm font-medium text-orange-700 hover:text-orange-800">
                Export CSV
              </button>
            </div>
            <ul className="border border-line bg-surface">
              {data.compliance.filings.map((f, i) => (
                <FilingRow
                  key={f.id}
                  filing={f}
                  withBorder={i < data.compliance.filings.length - 1}
                />
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function FilingTile({
  title,
  statusLabel,
  lastFiled,
  nextDue,
  detail,
  status,
}: {
  title: string;
  statusLabel: string;
  lastFiled: string;
  nextDue: string;
  detail: string;
  status: HealthStatus;
}) {
  const s = STATUS_STYLES[status];
  return (
    <div className="bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-stone-900">{title}</h3>
        <span
          className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}
        >
          <span className={`inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 text-xs text-stone-500">{detail}</p>
      <dl className="mt-4 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <dt className="text-stone-500">Last activity</dt>
          <dd className="font-mono text-stone-800">{lastFiled}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Next</dt>
          <dd className="font-mono text-stone-800">{nextDue}</dd>
        </div>
      </dl>
    </div>
  );
}

function FilingRow({ filing, withBorder }: { filing: Filing; withBorder: boolean }) {
  return (
    <li
      className={`grid grid-cols-12 items-center gap-3 px-5 py-3 text-sm ${
        withBorder ? "border-b border-line" : ""
      }`}
    >
      <span className="col-span-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
        <FileText className="h-3 w-3" />
        {filing.type}
      </span>
      <span className="col-span-4 text-stone-800">{filing.period}</span>
      <span className="col-span-3 font-mono text-xs text-stone-600">
        Filed {filing.filedDate}
      </span>
      <span className="col-span-2 text-xs text-stone-500">
        {filing.jurisdiction ?? ""}
      </span>
      <span className="col-span-1 text-right">
        <span className="inline-flex items-center border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
          {filing.status}
        </span>
      </span>
    </li>
  );
}
