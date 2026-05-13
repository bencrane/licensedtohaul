import { notFound } from "next/navigation";
import { Wallet, RefreshCw } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockOpportunities } from "@/lib/mock-opportunities";
import FinancingClientSection from "@/components/dashboard/FinancingClientSection";

type Props = {
  params: Promise<{ dot: string }>;
};

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

          <FinancingClientSection quotes={financing.activeQuotes} dot={cleanDot} />
        </div>
      </section>
    </>
  );
}
