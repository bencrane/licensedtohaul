import { notFound } from "next/navigation";
import { Wallet, RefreshCw, Check, Clock, Zap, FileText, Banknote } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockOpportunities } from "@/lib/mock-opportunities";
import type { FinancingQuote } from "@/lib/mock-opportunities";

type Props = {
  params: Promise<{ dot: string }>;
};

const STATUS_STYLES = {
  pending: { chip: "border-amber-200 bg-amber-50 text-amber-800", icon: <Clock className="h-3 w-3" /> },
  received: { chip: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: <Check className="h-3 w-3" /> },
} as const;

const TYPE_STYLES = {
  factoring: { label: "Invoice factoring", chip: "border-violet-200 bg-violet-50 text-violet-800", icon: <FileText className="h-3 w-3" /> },
  "fuel-advance": { label: "Fuel advance", chip: "border-orange-200 bg-orange-50 text-orange-800", icon: <Zap className="h-3 w-3" /> },
  "working-capital": { label: "Working capital", chip: "border-sky-200 bg-sky-50 text-sky-800", icon: <Banknote className="h-3 w-3" /> },
} as const;

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Financing · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function FinancingPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const opps = getMockOpportunities();
  const { financing } = opps;
  const factoringQuotes = financing.activeQuotes.filter((q) => q.type === "factoring");
  const otherQuotes = financing.activeQuotes.filter((q) => q.type !== "factoring");

  return (
    <>
      <PageHeader
        eyebrow="Financing"
        title="Get paid faster. Bridge the cash flow."
        description="Invoice factoring, fuel advances, and working-capital lines from operators that fund your customer mix and daily volume."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-stone-400" />
              {financing.currentFactor
                ? `Current: ${financing.currentFactor.name}`
                : "No factor on file"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {financing.activeQuotes.length} active quote{financing.activeQuotes.length === 1 ? "" : "s"}
            </span>
          </>
        }
        actions={
          <button className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700">
            <RefreshCw className="h-4 w-4" />
            Request fresh quotes
          </button>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Current state */}
          {!financing.currentFactor && (
            <div className="border border-line bg-surface p-6">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center border border-orange-200 bg-orange-50 text-orange-700">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl text-stone-900">
                    No factor on file.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700">
                    Quotes below come from factors that fund TX-based 5-25 PU
                    fleets running general freight. Compare rate, recourse,
                    funding speed, and monthly minimums before committing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Factoring quotes */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">
                Invoice factoring quotes
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                {factoringQuotes.length} {factoringQuotes.length === 1 ? "quote" : "quotes"}
              </span>
            </div>
            <ul className="grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
              {factoringQuotes.map((q) => (
                <FinancingCard key={q.id} quote={q} />
              ))}
            </ul>
          </div>

          {/* Other financing */}
          {otherQuotes.length > 0 && (
            <div>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-2xl text-stone-900">
                  Other financing
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  Fuel advances · working capital
                </span>
              </div>
              <ul className="grid gap-px border border-line bg-line md:grid-cols-2">
                {otherQuotes.map((q) => (
                  <FinancingCard key={q.id} quote={q} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function FinancingCard({ quote }: { quote: FinancingQuote }) {
  const s = STATUS_STYLES[quote.status];
  const t = TYPE_STYLES[quote.type];
  const isPending = quote.status === "pending";

  return (
    <li className={`bg-surface p-5 ${isPending ? "opacity-80" : ""}`}>
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${t.chip}`}
        >
          {t.icon}
          {t.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}
        >
          {s.icon}
          {quote.status}
        </span>
      </div>

      <h3 className="font-display mt-4 text-xl text-stone-900">
        {quote.factorName}
      </h3>

      <dl className="mt-4 space-y-2 text-xs">
        <Row label="Rate" value={quote.rate} />
        <Row label="Recourse" value={quote.recourseLabel} />
        <Row label="Funding speed" value={quote.fundingSpeed} />
        {quote.monthlyMinimum && <Row label="Minimum" value={quote.monthlyMinimum} />}
      </dl>

      {quote.notes && (
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-stone-600">
          {quote.notes}
        </p>
      )}

      {!isPending && (
        <button className="mt-5 inline-flex w-full items-center justify-center gap-1.5 bg-orange-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700">
          Take this quote
        </button>
      )}
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-b-0">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-mono text-stone-900">{value}</dd>
    </div>
  );
}
