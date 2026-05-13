import { notFound } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
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

  const activeFoR = await getActiveFactorOfRecord(cleanDot).catch(() => null);

  return (
    <>
      <PageHeader
        eyebrow="Financing"
        title="Your active factor relationship."
        description="Invoice factoring with your signed factor. All communications, NOA status, and disbursement history are in your deal room."
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-stone-400" />
            {activeFoR
              ? `Factor: ${activeFoR.factor_display_name}`
              : "No factor on file"}
          </span>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-8">
          {activeFoR ? (
            <div className="border border-line bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-xl text-stone-900">
                    {activeFoR.factor_display_name}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Active factor of record since{" "}
                    {new Date(activeFoR.assigned_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Link
                  href={`/dashboard/${cleanDot}/financing/${activeFoR.factor_slug}`}
                  className="inline-flex items-center gap-2 bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  Open deal room
                </Link>
              </div>
            </div>
          ) : (
            <div className="border border-line bg-white p-8 text-center">
              <Wallet className="mx-auto h-8 w-8 text-stone-300 mb-3" />
              <p className="font-display text-lg text-stone-900">No factor on file.</p>
              <p className="mt-2 text-sm text-stone-500 max-w-md mx-auto">
                Invoice factoring works through a signed Notice of Assignment with your chosen factor.
                Contact your factor to begin the NOA process.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
