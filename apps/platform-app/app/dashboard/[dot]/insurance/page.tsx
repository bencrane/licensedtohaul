import { notFound } from "next/navigation";
import { Shield, Upload, RefreshCw, Check, Clock, AlertCircle } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockDashboard } from "@/lib/mock-dashboard";
import { getMockOpportunities } from "@/lib/mock-opportunities";
import type { InsuranceQuote } from "@/lib/mock-opportunities";

type Props = {
  params: Promise<{ dot: string }>;
};

const STATUS_STYLES = {
  pending: { chip: "border-amber-200 bg-amber-50 text-amber-800", icon: <Clock className="h-3 w-3" /> },
  received: { chip: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: <Check className="h-3 w-3" /> },
  declined: { chip: "border-red-200 bg-red-50 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
} as const;

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Insurance · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function InsurancePage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const data = getMockDashboard(cleanDot);
  const opps = getMockOpportunities();
  const { insurance } = data;
  const received = opps.insurance.activeQuotes.filter((q) => q.status === "received");
  const cheapest = received.reduce<InsuranceQuote | null>(
    (min, q) => (!min || q.premiumUsd < min.premiumUsd ? q : min),
    null,
  );
  const savings = cheapest
    ? Math.max(0, 14240 - cheapest.premiumUsd)
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="Insurance"
        title="Quotes for your renewal."
        description="Quote requests routed to brokers that write your operating class, geography, and loss profile. Loss runs uploaded once, used across every broker."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-stone-400" />
              Current: {insurance.insurer} · expires in {insurance.daysToExpiration} days
            </span>
            <span className="inline-flex items-center gap-1.5">
              {opps.insurance.activeQuotes.length} active quote {opps.insurance.activeQuotes.length === 1 ? "request" : "requests"}
            </span>
          </>
        }
        actions={
          <>
            <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
              <Upload className="h-4 w-4" />
              Upload loss runs
            </button>
            <button className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700">
              <RefreshCw className="h-4 w-4" />
              Request fresh quotes
            </button>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Current policy + savings summary */}
          <div className="grid gap-6 lg:grid-cols-12">
            <section className="border border-line bg-surface lg:col-span-7">
              <header className="border-b border-line px-5 py-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Current policy
                </h2>
              </header>
              <div className="grid gap-px bg-line lg:grid-cols-2">
                <Cell label="Insurer" value={insurance.insurer} />
                <Cell label="Policy number" value={insurance.policyNumber} mono />
                <Cell label="BIPD limit" value={insurance.bipdLimit} mono />
                <Cell label="Cargo limit" value={insurance.cargoLimit} mono />
                <Cell label="Effective" value={insurance.effective} />
                <Cell
                  label="Expires"
                  value={`${insurance.expires} (${insurance.daysToExpiration} days)`}
                />
              </div>
            </section>

            {cheapest && savings > 0 && (
              <section className="border border-emerald-200 bg-emerald-50/50 lg:col-span-5">
                <div className="p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                    Best quote so far
                  </p>
                  <p className="font-display mt-3 text-3xl text-stone-900">
                    ${cheapest.premiumUsd.toLocaleString()}
                    <span className="text-base text-stone-500"> / yr</span>
                  </p>
                  <p className="mt-1 text-sm text-stone-700">{cheapest.brokerName}</p>
                  <p className="mt-4 inline-flex items-baseline gap-2 text-sm">
                    <span className="font-mono text-emerald-800">
                      −${savings.toLocaleString()}
                    </span>
                    <span className="text-stone-600">vs. current annual premium</span>
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Quote comparison */}
          <div>
            <h2 className="font-display mb-4 text-2xl text-stone-900">
              Quote comparison
            </h2>
            <div className="overflow-x-auto border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-stone-50/60 text-left">
                    <Th>Broker</Th>
                    <Th>BIPD</Th>
                    <Th>Cargo</Th>
                    <Th align="right">Premium</Th>
                    <Th align="right">Deductible</Th>
                    <Th>Status</Th>
                    <Th>Notes</Th>
                  </tr>
                </thead>
                <tbody>
                  {opps.insurance.activeQuotes.map((q) => (
                    <QuoteRow key={q.id} quote={q} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-stone-500">
              Last quote round requested {opps.insurance.lastQuoteRequestedAt}. Use Request fresh quotes to start a new round.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function Cell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className={`mt-1 ${mono ? "font-mono text-sm text-stone-900" : "text-sm text-stone-800"}`}>
        {value}
      </p>
    </div>
  );
}

function QuoteRow({ quote }: { quote: InsuranceQuote }) {
  const s = STATUS_STYLES[quote.status];
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-stone-50/40">
      <td className="px-4 py-3 text-stone-900">{quote.brokerName}</td>
      <td className="px-4 py-3 font-mono text-xs text-stone-700">
        {quote.bipdLimit}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-stone-700">
        {quote.cargoLimit}
      </td>
      <td className="px-4 py-3 text-right font-mono text-stone-900">
        {quote.premiumUsd ? `$${quote.premiumUsd.toLocaleString()}` : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-stone-700">
        {quote.deductibleUsd ? `$${quote.deductibleUsd.toLocaleString()}` : "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}
        >
          {s.icon}
          {quote.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-stone-600">{quote.notes ?? "—"}</td>
    </tr>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}
