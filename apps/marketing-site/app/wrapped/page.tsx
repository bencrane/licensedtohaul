import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Your Authority, Wrapped — Licensed to Haul",
  description:
    "Enter your USDOT. See where you stand against every other carrier in the FMCSA registry. 30 seconds.",
};

type SearchParams = Promise<{ dot?: string }>;

async function go(formData: FormData): Promise<void> {
  "use server";
  const raw = String(formData.get("dot") ?? "");
  const clean = raw.replace(/\D/g, "");
  if (!clean || clean.length < 3) {
    redirect("/wrapped?error=invalid");
  }
  redirect(`/wrapped/${clean}`);
}

export default async function WrappedLandingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { dot } = await searchParams;

  return (
    <section className="relative overflow-hidden bg-background">
      <div aria-hidden className="absolute inset-0 paper-grid opacity-40" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center px-6 py-20">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700">
          Your authority · wrapped
        </p>
        <h1 className="font-display mt-5 text-6xl leading-[0.95] text-stone-900 text-balance md:text-7xl">
          A look at your
          <br />
          <span className="text-orange-600">numbers.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-stone-700">
          Where you sit against every other US motor carrier. Years in
          business, safety record, insurance posture, fleet placement.
          Pulled from the FMCSA registry. 30 seconds.
        </p>

        <form action={go} className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <label className="sr-only" htmlFor="dot">
            USDOT number
          </label>
          <input
            id="dot"
            name="dot"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            minLength={3}
            maxLength={9}
            placeholder="Your USDOT number"
            defaultValue={dot ?? ""}
            className="flex-1 border border-line-strong bg-white px-5 py-4 font-mono text-lg tracking-wide text-stone-900 placeholder:text-stone-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <button
            type="submit"
            className="group inline-flex items-center justify-center gap-2 bg-orange-600 px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-orange-700"
          >
            See my numbers
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        <p className="mt-6 text-xs text-stone-500">
          Public FMCSA data only. No sign-up, no email required to view.
        </p>

        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-10 sm:grid-cols-3">
          <Stat label="Years in business" value="Tenure cohort" />
          <Stat label="Safety record" value="OOS percentile" />
          <Stat label="Insurance posture" value="vs FMCSA minimum" />
          <Stat label="Fleet placement" value="Size band" />
          <Stat label="Filing discipline" value="MCS-150 status" />
          <Stat label="Authority days" value="Continuous since" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-stone-700">{value}</p>
    </div>
  );
}
