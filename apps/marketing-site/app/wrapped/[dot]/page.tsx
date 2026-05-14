import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import WrappedCard from "@/components/wrapped/WrappedCard";
import {
  getWrappedData,
  formatCurrency,
  formatNumber,
  formatDate,
} from "@/lib/wrapped/data";
import {
  yearsPercentile,
  safetyPercentile,
  insurancePercentile,
  fleetBucket,
  topPercent,
  ratioToAverage,
  daysAsEarthOrbits,
  MCS150_LAPSE_RATE,
  NATIONAL_VEHICLE_OOS_AVG,
  FMCSA_BIPD_MINIMUM,
} from "@/lib/wrapped/percentiles";

type Props = {
  params: Promise<{ dot: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  return {
    title: `USDOT ${cleanDot} · Wrapped — Licensed to Haul`,
    description:
      "Your authority by the numbers. Where you stand against every other carrier in the FMCSA registry.",
  };
}

export default async function WrappedRevealPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot || cleanDot.length < 3) notFound();

  const data = await getWrappedData(cleanDot);

  const tenurePct = yearsPercentile(data.yearsInBusiness);
  const tenureTop = topPercent(tenurePct);
  const safetyPct = safetyPercentile(data.safety.vehicleOosRate);
  const safetyTop = topPercent(safetyPct);
  const insurancePct = insurancePercentile(data.insurance.bipdAmount);
  const fleet = fleetBucket(data.fleet.powerUnits);
  const orbits = daysAsEarthOrbits(data.daysUnderAuthority);
  const oosRatio = ratioToAverage(data.safety.vehicleOosRate);

  const insuranceMultiplier =
    Math.round((data.insurance.bipdAmount / FMCSA_BIPD_MINIMUM) * 10) / 10;

  return (
    <div className="snap-y snap-mandatory">
      {/* Cover */}
      <WrappedCard
        tone="cream"
        eyebrow="USDOT · wrapped"
        number={cleanDot}
        headline={
          <>
            <span className="block text-stone-500">{data.legalName}.</span>
            <span className="block">
              Here&rsquo;s where you{" "}
              <span className="text-orange-600">sit.</span>
            </span>
          </>
        }
        body={
          <>
            Pulled from public FMCSA data. Six cards. Scroll to take a look.
          </>
        }
        footer={
          <span className="inline-flex items-center gap-2">
            Scroll <ArrowDown className="h-3.5 w-3.5" />
          </span>
        }
      />

      {/* Tenure */}
      <WrappedCard
        tone="orange"
        eyebrow="Tenure"
        number={String(data.yearsInBusiness)}
        numberUnit={data.yearsInBusiness === 1 ? "year" : "years"}
        headline={
          <>
            You&rsquo;ve held active authority for{" "}
            <span className="opacity-80">{formatNumber(data.daysUnderAuthority)}</span>{" "}
            days.
          </>
        }
        body={
          tenurePct >= 50 ? (
            <>
              That puts you in the <strong>top {tenureTop}%</strong> of active US
              carriers by tenure. Most carriers don&rsquo;t make it past year five.
              You did.
            </>
          ) : (
            <>
              You&rsquo;re among the{" "}
              <strong>~250,000 newer authorities</strong> running freight in the US
              today. Median carrier tenure is seven years — you&rsquo;re building
              toward it.
            </>
          )
        }
        footer={
          <>
            Authority granted {formatDate(data.authorityGranted)} ·{" "}
            {data.domicileState} · {data.authorityTypes.join(" · ")}
          </>
        }
      />

      {/* Days / orbits */}
      <WrappedCard
        tone="cream"
        eyebrow="Days under authority"
        number={formatNumber(data.daysUnderAuthority)}
        numberUnit="days"
        headline={
          <>
            At industry-average daily miles, that&rsquo;s{" "}
            <span className="text-orange-600">
              {orbits}× around the earth.
            </span>
          </>
        }
        body={
          <>
            Every one of those days you&rsquo;ve been an active, FMCSA-registered
            interstate carrier. No lapses, no gaps. Compounding.
          </>
        }
        footer={
          <>
            Assumes 250 mi/day per truck · Earth circumference 24,901 mi
          </>
        }
      />

      {/* Safety */}
      <WrappedCard
        tone="ink"
        eyebrow="Safety record"
        number={`${data.safety.vehicleOosRate}%`}
        headline={
          safetyPct >= 65 ? (
            <>
              Your vehicle out-of-service rate is{" "}
              <span className="text-orange-400">{oosRatio}×</span> the national
              average of {NATIONAL_VEHICLE_OOS_AVG}%.
            </>
          ) : safetyPct >= 35 ? (
            <>
              Right around the national average of{" "}
              <span className="text-orange-400">{NATIONAL_VEHICLE_OOS_AVG}%</span>{" "}
              — room to improve, but you&rsquo;re running the average.
            </>
          ) : (
            <>
              Higher than the national average. Worth a closer look at
              maintenance and pre-trip.
            </>
          )
        }
        body={
          <>
            Based on {data.safety.inspections24mo} roadside inspections over the
            last 24 months
            {data.safety.crashes24mo === 0
              ? " with zero recordable crashes."
              : ` and ${data.safety.crashes24mo} recordable crash${
                  data.safety.crashes24mo === 1 ? "" : "es"
                }.`}{" "}
            {safetyPct >= 65 && (
              <>
                You&rsquo;re in the <strong>top {safetyTop}%</strong> of carriers
                in your size band.
              </>
            )}
          </>
        }
        footer={
          <>
            Driver OOS: {data.safety.driverOosRate}% · National avg per FMCSA
            Pocket Guide: {NATIONAL_VEHICLE_OOS_AVG}%
          </>
        }
      />

      {/* Insurance */}
      <WrappedCard
        tone="white"
        eyebrow="Insurance posture"
        number={formatCurrency(data.insurance.bipdAmount)}
        numberUnit="BIPD"
        headline={
          insurancePct >= 72 ? (
            <>
              You carry{" "}
              <span className="text-orange-600">{insuranceMultiplier}×</span>{" "}
              the FMCSA minimum.
            </>
          ) : (
            <>
              You meet the FMCSA minimum of {formatCurrency(FMCSA_BIPD_MINIMUM)}.
            </>
          )
        }
        body={
          <>
            Brokers and shippers see this number first. Carriers above $1M get
            cleared into broker boards that single-truck operators on the
            minimum often can&rsquo;t access.
          </>
        }
        footer={
          <>
            Insurer: {data.insurance.carrier} · Current through{" "}
            {formatDate(data.insurance.expiresAt)}
          </>
        }
      />

      {/* Fleet placement */}
      <WrappedCard
        tone="cream"
        eyebrow="Fleet placement"
        number={formatNumber(data.fleet.powerUnits)}
        numberUnit={data.fleet.powerUnits === 1 ? "truck" : "trucks"}
        headline={
          <>
            <span className="text-orange-600">{fleet.label}.</span> About{" "}
            {fleet.share}% of US carriers operate at your fleet size.
          </>
        }
        body={
          <>
            {formatNumber(data.fleet.drivers)} driver
            {data.fleet.drivers === 1 ? "" : "s"} on the roster.{" "}
            {data.fleet.powerUnits === 1
              ? "Single-truck owner-operators move ~40% of US trucking miles. You're the spine of the industry."
              : data.fleet.powerUnits <= 6
                ? "Small fleets are the fastest-growing segment of new authority grants — and the hardest to scale."
                : "You're operating at a fleet size most authorities never reach."}
          </>
        }
        footer={
          <>
            Power units : drivers ratio{" "}
            {(data.fleet.drivers / data.fleet.powerUnits).toFixed(1)} ·{" "}
            {data.authorityTypes.join(" · ")}
          </>
        }
      />

      {/* Filing discipline */}
      <WrappedCard
        tone="orange"
        eyebrow="Filing discipline"
        number={formatNumber(data.mcs150.lastFiledDaysAgo)}
        numberUnit={data.mcs150.lastFiledDaysAgo === 1 ? "day" : "days"}
        headline={
          data.mcs150.isCurrent ? (
            <>
              since your last MCS-150 update. You&rsquo;re{" "}
              <span className="opacity-80">current.</span>
            </>
          ) : (
            <>
              since your last MCS-150 update. You&rsquo;re overdue.
            </>
          )
        }
        body={
          data.mcs150.isCurrent ? (
            <>
              <strong>{MCS150_LAPSE_RATE}% of US carriers</strong> let MCS-150 go
              more than two years without an update, which puts them into FMCSA
              deactivation queues. You&rsquo;re not in that bucket.
            </>
          ) : (
            <>
              MCS-150 updates are biennial. Carriers who let it lapse risk
              authority deactivation by FMCSA. Worth resolving this week.
            </>
          )
        }
        footer={<>USDOT biennial update · FMCSA registry</>}
      />

      {/* CTA */}
      <WrappedCard
        tone="cream"
        eyebrow="This is the public side"
        headline={
          <>
            Claim your authority on Licensed to Haul to see
            <br />
            <span className="text-orange-600">
              freight, financing, fuel, insurance, and compliance
            </span>{" "}
            — pegged to your DOT.
          </>
        }
        body={
          <>
            Everything you just saw came from the public FMCSA registry.
            Claiming your authority unlocks live broker watchlists, direct
            financing quotes, fuel card pricing, equipment recall feeds, and
            the deadline tracker that keeps your authority from going inactive.
          </>
        }
        footer={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={`/claim?dot=${cleanDot}`}
              className="group inline-flex items-center gap-2 bg-orange-600 px-7 py-4 text-[15px] font-semibold normal-case tracking-normal text-white transition-colors hover:bg-orange-700"
            >
              Claim Your Authority
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/wrapped"
              className="font-mono text-[11px] underline-offset-4 hover:underline"
            >
              Look up another USDOT
            </Link>
          </div>
        }
      />
    </div>
  );
}
