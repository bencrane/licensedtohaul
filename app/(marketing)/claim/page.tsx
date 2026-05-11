import { Activity, BadgeCheck, Clock, Mail } from "lucide-react";
import ClaimForm from "@/components/forms/ClaimForm";

export const metadata = {
  title: "Claim Your Authority — Licensed to Haul",
  description: "Claim your USDOT authority. See your live FMCSA profile.",
};

type SearchParams = Promise<{ dot?: string; next?: string }>;

const items = [
  {
    icon: <Activity className="h-5 w-5" />,
    title: "Your live FMCSA profile",
    body: "MCS-150 status, crash record, inspection history, hazmat endorsements, fleet size, and authority age. Refreshed daily.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Active authorities only",
    body: "Licensed to Haul is for active FMCSA authorities. We verify against the federal registry before sending your dashboard link.",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Email tied to events",
    body: "We email when something in your authority shifts: an insurance renewal window opens, an inspection lands, a load matches your lanes, a filing deadline approaches.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Thirty seconds",
    body: "USDOT and email is all we need to look you up. The dashboard link lands in your inbox within a few minutes.",
  },
];

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { dot } = await searchParams;

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 paper-grid opacity-40" />

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-20">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
              Claim Your Authority
            </p>
            <h1 className="font-display mt-4 text-5xl leading-[1.05] text-stone-900 text-balance">
              USDOT in. Dashboard out.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-stone-700">
              Enter your USDOT and email. We pull your live FMCSA
              profile and email the dashboard link to you within a
              few minutes.
            </p>

            <ul className="mt-10 space-y-5">
              {items.map((r) => (
                <li key={r.title} className="flex gap-4">
                  <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center border border-orange-200 bg-orange-50 text-orange-700">
                    {r.icon}
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-stone-900">
                      {r.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">
                      {r.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="border border-line-strong bg-surface p-7 shadow-[0_24px_60px_-30px_rgba(26,20,16,0.18)] md:p-10">
              <ClaimForm defaultDot={dot} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
