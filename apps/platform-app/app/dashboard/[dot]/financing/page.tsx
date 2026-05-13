import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { listFactorProfiles } from "@/lib/factor-profiles/actions";
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

  const factorProfiles = await listFactorProfiles();

  return (
    <>
      <PageHeader
        eyebrow="Financing"
        title="Get paid faster. Bridge the cash flow."
        description="Invoice factoring from operators that fund your customer mix and daily volume. Submit your profile for a quote."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-stone-400" />
              {factorProfiles.length} factor{factorProfiles.length === 1 ? "" : "s"} available
            </span>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {factorProfiles.length === 0 && (
            <div className="border border-line bg-surface p-6">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center border border-orange-200 bg-orange-50 text-orange-700">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl text-stone-900">
                    No factors available yet.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700">
                    Factoring partners publish their intake criteria here. Check back soon.
                  </p>
                </div>
              </div>
            </div>
          )}

          <FinancingClientSection profiles={factorProfiles} dot={cleanDot} />
        </div>
      </section>
    </>
  );
}
