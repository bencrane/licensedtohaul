import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CategoryGrid from "@/components/marketing/CategoryGrid";

export const metadata = {
  title: "Opportunities — Licensed to Haul",
  description:
    "What your authority unlocks: freight, insurance, financing, fuel, equipment, and compliance.",
};

export default function OpportunitiesPage() {
  return (
    <>
      <section className="warm-wash border-b border-line">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 md:pt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
            Opportunities
          </p>
          <h1 className="font-display mt-4 text-5xl leading-[1.05] text-stone-900 text-balance md:text-6xl">
            What your authority unlocks.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-700">
            Six categories. Each one matches against your live FMCSA
            profile and shows up in your dashboard when it fits.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <CategoryGrid variant="hub" />
        </div>
      </section>

      <section className="border-t border-line bg-stone-100">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                Claim first
              </p>
              <h2 className="font-display mt-3 text-3xl leading-tight text-stone-900 md:text-4xl text-balance">
                These match against your live authority profile.
              </h2>
              <p className="mt-4 max-w-xl text-stone-700">
                Claim your USDOT, get your dashboard link by email, and
                see opportunities that fit your specific operating
                profile.
              </p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <Link
                href="/claim"
                className="inline-flex items-center justify-center gap-2 bg-orange-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
              >
                Claim Your Authority
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
