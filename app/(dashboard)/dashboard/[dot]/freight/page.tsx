import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  MapPin,
  ArrowRight,
  Bookmark,
  ListFilter,
  Activity,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockDashboard } from "@/lib/mock-dashboard";
import { getMockOpportunities } from "@/lib/mock-opportunities";
import type { LaneOpportunity, BrokerCreditEntry } from "@/lib/mock-opportunities";

type Props = {
  params: Promise<{ dot: string }>;
};

const TIER_STYLES: Record<"A" | "B" | "C", string> = {
  A: "border-emerald-200 bg-emerald-50 text-emerald-800",
  B: "border-amber-200 bg-amber-50 text-amber-800",
  C: "border-red-200 bg-red-50 text-red-800",
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Freight · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function FreightPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const carrier = getMockDashboard(cleanDot).carrier;
  const opps = getMockOpportunities();
  const matchedLanes = opps.lanes.filter((l) =>
    carrier.operatingStates.includes(l.origin.state) ||
    carrier.operatingStates.includes(l.destination.state),
  );

  return (
    <>
      <PageHeader
        eyebrow="Freight"
        title="Lanes that fit your authority."
        description="Direct freight from brokers and shippers matched against your equipment, lane history, and operating geography. Pay terms and broker credit visible before you book."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              {matchedLanes.length} lanes match your operating profile right now
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-stone-400" />
              Equipment: {carrier.cargoCarried.join(", ")}
            </span>
          </>
        }
        actions={
          <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
            <ListFilter className="h-4 w-4" />
            Filter
          </button>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Lanes */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">
                Available lanes
              </h2>
              <div className="flex gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                <button className="border border-line-strong bg-white px-2.5 py-1 text-stone-700">
                  All
                </button>
                <button className="px-2.5 py-1 hover:text-stone-700">Quick-pay</button>
                <button className="px-2.5 py-1 hover:text-stone-700">Dry van</button>
                <button className="px-2.5 py-1 hover:text-stone-700">Reefer</button>
                <button className="px-2.5 py-1 hover:text-stone-700">Flatbed</button>
              </div>
            </div>
            <ul className="space-y-3">
              {opps.lanes.map((lane) => (
                <LaneCard key={lane.id} lane={lane} />
              ))}
            </ul>
          </div>

          {/* Broker credit */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl text-stone-900">
                  Broker pay history
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Brokers you've run with, average days to pay, and credit tier.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                {opps.brokerCredit.length} brokers
              </span>
            </div>
            <div className="overflow-x-auto border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-stone-50/60 text-left">
                    <Th>Broker</Th>
                    <Th align="right">Loads YTD</Th>
                    <Th align="right">Avg pay days</Th>
                    <Th>Tier</Th>
                    <Th>Notes</Th>
                  </tr>
                </thead>
                <tbody>
                  {opps.brokerCredit.map((b) => (
                    <BrokerRow key={b.brokerName} entry={b} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function LaneCard({ lane }: { lane: LaneOpportunity }) {
  const tierClass = TIER_STYLES[lane.brokerCreditTier];
  return (
    <li className="border border-line bg-surface">
      <div className="grid gap-px bg-line md:grid-cols-12">
        <div className="bg-surface p-5 md:col-span-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            {lane.postedRelative}
          </p>
          <p className="font-display mt-2 text-xl leading-snug text-stone-900">
            {lane.origin.city}, {lane.origin.state}
            <span className="px-1.5 text-stone-400">→</span>
            {lane.destination.city}, {lane.destination.state}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-stone-500">
            <MapPin className="h-3 w-3 text-stone-400" />
            {lane.miles} miles
          </p>
        </div>

        <div className="bg-surface p-5 md:col-span-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            Load detail
          </p>
          <dl className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-stone-500">Equipment</dt>
              <dd className="text-stone-800">{lane.equipment}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Pickup</dt>
              <dd className="font-mono text-stone-800">{lane.pickupDate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Weight</dt>
              <dd className="font-mono text-stone-800">{lane.weightLbs.toLocaleString()} lbs</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5">
              <dt className="text-stone-500">Rate</dt>
              <dd className="font-mono text-stone-900">
                ${lane.rateUsd.toLocaleString()}{" "}
                <span className="text-stone-500">(${lane.ratePerMile.toFixed(2)}/mi)</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-surface p-5 md:col-span-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Broker
            </p>
            <span
              className={`inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${tierClass}`}
            >
              Tier {lane.brokerCreditTier}
            </span>
          </div>
          <p className="font-display mt-2 text-base text-stone-900">
            {lane.brokerName}
          </p>
          <p className="mt-1 text-xs text-stone-600">{lane.payTerms}</p>
          <p className="mt-1 font-mono text-[11px] text-stone-500">
            Avg pay: {lane.brokerCreditDays} days
          </p>

          <div className="mt-4 flex gap-2">
            <button className="inline-flex flex-1 items-center justify-center gap-1.5 bg-orange-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700">
              Book load
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button className="inline-flex items-center justify-center gap-1.5 border border-line bg-white px-3 py-2 text-xs text-stone-700 transition-colors hover:border-stone-400">
              <Bookmark className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function BrokerRow({ entry }: { entry: BrokerCreditEntry }) {
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-stone-50/40">
      <td className="px-4 py-3 text-stone-900">{entry.brokerName}</td>
      <td className="px-4 py-3 text-right font-mono text-stone-800">
        {entry.loadsThisYear}
      </td>
      <td className="px-4 py-3 text-right font-mono text-stone-800">
        {entry.avgPayDays}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${TIER_STYLES[entry.tier]}`}
        >
          Tier {entry.tier}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-stone-600">{entry.notes}</td>
    </tr>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}
