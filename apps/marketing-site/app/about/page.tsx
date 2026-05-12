import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "About — Licensed to Haul",
  description:
    "Licensed to Haul is a dashboard built on the FMCSA motor carrier registry. For active licensed motor carriers.",
};

export default function AboutPage() {
  return (
    <>
      <section className="warm-wash relative overflow-hidden border-b border-line">
        <div aria-hidden className="absolute inset-0 paper-grid opacity-40" />

        <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-12 md:pt-16 md:pb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
            About
          </p>
          <h1 className="font-display mt-3 text-4xl leading-[1.05] text-stone-900 text-balance md:text-5xl">
            Built for active motor carriers.
          </h1>

          <div className="mt-8 grid gap-8 text-base leading-relaxed text-stone-700 md:grid-cols-2 md:gap-12">
            <p>
              Licensed to Haul is a dashboard built on the FMCSA
              motor carrier registry. We index every active US
              authority every day.
            </p>
            <p>
              When something in your authority changes — an MCS-150
              refresh window opens, an inspection lands, your fleet
              adds a unit, your insurance renewal approaches — it
              shows up in your dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid gap-px border border-line bg-line md:grid-cols-3">
            <Pillar
              eyebrow="Federal data, daily"
              body="The FMCSA publishes daily updates to the motor carrier registry: MCS-150 filings, crash records, inspection results, hazmat endorsements, authority adds, fleet changes. We ingest the whole registry every 24 hours."
            />
            <Pillar
              eyebrow="Matched to your authority"
              body="Freight matches your lane history and equipment. Insurance and financing quotes route to operators that write carriers in your operating class. Compliance reminders track your specific filing cadence."
            />
            <Pillar
              eyebrow="Yours to leave"
              body="One-click account deletion removes your profile and history. Your USDOT stays public information (it always was). Nothing we built around it stays."
            />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-stone-100">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-12 md:gap-14">
            <div className="md:col-span-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                The model
              </p>
              <h2 className="font-display mt-3 text-3xl leading-tight text-stone-900 md:text-4xl text-balance">
                Free for licensed carriers.
              </h2>
            </div>
            <div className="md:col-span-8 space-y-4 text-base leading-relaxed text-stone-700">
              <p>
                Licensed to Haul stays free for active authorities.
                The site is paid for by the operators that show up in
                your dashboard when they fit your profile — insurance
                brokers, factors, fuel programs, equipment lenders.
                They get access to engaged carrier traffic with
                verified operating data. You decide whether to take
                the conversation.
              </p>
              <p>
                Independent operation. The registry is public federal
                data; we index it and put it to work in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="border border-orange-200 bg-gradient-to-br from-orange-50 via-stone-50 to-stone-50 p-10 md:p-14">
            <div className="grid gap-8 md:grid-cols-12 md:items-center">
              <div className="md:col-span-8">
                <h2 className="font-display text-3xl text-stone-900 md:text-4xl text-balance">
                  Claim your authority.
                </h2>
                <p className="mt-3 max-w-xl text-stone-700">
                  USDOT and email. Dashboard link in your inbox.
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
        </div>
      </section>
    </>
  );
}

function Pillar({ eyebrow, body }: { eyebrow: string; body: string }) {
  return (
    <div className="bg-surface p-7 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
        {eyebrow}
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-stone-700">{body}</p>
    </div>
  );
}
