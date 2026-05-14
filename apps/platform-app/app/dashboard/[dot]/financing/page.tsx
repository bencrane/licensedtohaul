import { notFound } from "next/navigation";
import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import FinancingClientSection from "@/components/dashboard/FinancingClientSection";
import { getMockOpportunities } from "@/lib/mock-opportunities";
import { getActiveFactorOfRecord } from "@/lib/factor-of-record/queries";

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
  const quotes = opps.financing.activeQuotes;
  const factoringCount = quotes.filter((q) => q.type === "factoring").length;
  const activeFoR = await getActiveFactorOfRecord(cleanDot).catch(() => null);

  return (
    <>
      <PageHeader
        eyebrow="Financing"
        title="Compare factoring partners."
        description="Quotes from factoring partners that fund carriers like yours. Rate, funding speed, and recourse terms are shown upfront. Submit to the partner you like — they'll reach out to finalize NOA and onboarding off-platform."
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-stone-400" />
            {factoringCount} factoring {factoringCount === 1 ? "quote" : "quotes"} ·{" "}
            {quotes.length - factoringCount} other
          </span>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {activeFoR && (
            <Link
              href={`/dashboard/${cleanDot}/financing/${activeFoR.factor_slug}`}
              className="group flex items-center justify-between border border-line bg-stone-50 px-4 py-3 transition-colors hover:border-orange-300 hover:bg-orange-50"
            >
              <span className="inline-flex items-center gap-2 text-sm text-stone-700">
                <Wallet className="h-4 w-4 text-stone-400" />
                You have an active factor relationship with{" "}
                <span className="font-semibold text-stone-900">
                  {activeFoR.factor_display_name}
                </span>
                . Communications and disbursements are in your deal room.
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-orange-700 group-hover:text-orange-800">
                Open deal room
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          )}

          <FinancingClientSection quotes={quotes} dot={cleanDot} />
        </div>
      </section>
    </>
  );
}
