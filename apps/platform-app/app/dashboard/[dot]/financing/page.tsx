import { notFound } from "next/navigation";
import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import FinancingClientSection from "@/components/dashboard/FinancingClientSection";
import { getMockOpportunities } from "@/lib/mock-opportunities";
import { getActiveFactorOfRecord } from "@/lib/factor-of-record/queries";
import { getOpenSubmissionsForCarrier } from "@/lib/quote-submissions/queries";
import { getFactorDisplayName } from "@/lib/factor-of-record/types";
import type { QuoteSubmission } from "@/lib/quote-submissions/types";

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

  const [activeFoR, openSubmissions] = await Promise.all([
    getActiveFactorOfRecord(cleanDot).catch(() => null),
    getOpenSubmissionsForCarrier(cleanDot).catch((): QuoteSubmission[] => []),
  ]);

  // Build a map of factorSlug -> stage for the FinancingClientSection to read
  const submissionMap: Record<string, string> = {};
  for (const sub of openSubmissions) {
    submissionMap[sub.factorSlug] = sub.stage;
  }

  // Combine open submissions + active FoR (avoid duplicates)
  const activeSlugs = new Set(openSubmissions.map((s) => s.factorSlug));
  const allSubmissions: QuoteSubmission[] = [...openSubmissions];
  if (activeFoR && !activeSlugs.has(activeFoR.factor_slug)) {
    // There's an active FoR but no submission row — legacy relationship
    const legacySub: QuoteSubmission = {
      id: activeFoR.id,
      carrierDot: cleanDot,
      factorSlug: activeFoR.factor_slug,
      quoteId: activeFoR.noa_envelope_id ?? activeFoR.factor_slug,
      stage: "active",
      rate: "—",
      recourseLabel: "—",
      fundingSpeed: "—",
      monthlyMinimum: null,
      notes: null,
      fieldsShared: [],
      noaEnvelopeId: activeFoR.noa_envelope_id ?? null,
      factorOfRecordId: activeFoR.id,
      submittedAt: activeFoR.assigned_at,
      updatedAt: activeFoR.assigned_at,
    };
    allSubmissions.push(legacySub);
    submissionMap[activeFoR.factor_slug] = "active";
  }

  return (
    <>
      <PageHeader
        eyebrow="Financing"
        title="Compare factoring partners."
        description="Quotes from factoring partners that fund carriers like yours. Rate, funding speed, and recourse terms are shown upfront. Submit to the partner you like — NOA signing, onboarding, and disbursements all happen on-platform in your deal room."
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
          {/* Active deals mini-list */}
          {allSubmissions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Active deals
              </p>
              <ul className="divide-y divide-line border border-line bg-white">
                {allSubmissions.map((sub) => (
                  <li key={sub.factorSlug}>
                    <Link
                      href={`/dashboard/${cleanDot}/financing/${sub.factorSlug}`}
                      className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-orange-50"
                    >
                      <span className="inline-flex items-center gap-2 text-sm text-stone-700">
                        <Wallet className="h-4 w-4 text-stone-400" />
                        <span className="font-semibold text-stone-900">
                          {getFactorDisplayName(sub.factorSlug)}
                        </span>
                        <span className="inline-flex items-center border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-800">
                          {sub.stage}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-orange-700 group-hover:text-orange-800">
                        Open deal room
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FinancingClientSection
            quotes={quotes}
            dot={cleanDot}
            submissionMap={submissionMap}
          />
        </div>
      </section>
    </>
  );
}
