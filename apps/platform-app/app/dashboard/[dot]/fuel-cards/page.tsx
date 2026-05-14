import { notFound } from "next/navigation";
import { Fuel, Check, X, Calculator } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockOpportunities } from "@/lib/mock-opportunities";
import type { FuelProgram } from "@/lib/mock-opportunities";
import { MockSection } from "@/components/MockSection";

type Props = {
  params: Promise<{ dot: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Fuel cards · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function FuelCardsPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const opps = getMockOpportunities();
  const { fuel } = opps;
  const sorted = [...fuel.availablePrograms].sort(
    (a, b) => b.estAnnualSavings - a.estAnnualSavings,
  );
  const best = sorted[0];

  return (
    <>
      <PageHeader
        eyebrow="Fuel cards"
        title="Fuel programs that pay back at the pump."
        description="Per-gallon discounts at TA, Petro, Loves, Pilot, and independents. Card-level driver controls and real-time reporting included on all programs."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Fuel className="h-3.5 w-3.5 text-stone-400" />
              {fuel.currentProgram
                ? `Current: ${fuel.currentProgram.name}`
                : "No fuel program on file"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {fuel.availablePrograms.length} programs available
            </span>
          </>
        }
      />

      <MockSection tooltip="Fuel card integration not yet wired">
      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Best-savings highlight */}
          <div className="border border-emerald-200 bg-emerald-50/50">
            <div className="grid gap-px bg-emerald-200/60 lg:grid-cols-12">
              <div className="bg-emerald-50/40 p-6 lg:col-span-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                  Highest projected annual savings
                </p>
                <h2 className="font-display mt-3 text-3xl leading-tight text-stone-900">
                  {best.programName}
                </h2>
                <p className="mt-2 text-sm text-stone-700">{best.network}</p>
              </div>
              <div className="bg-emerald-50/40 p-6 lg:col-span-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                  Estimated annual savings
                </p>
                <p className="font-display mt-2 text-4xl text-stone-900">
                  ${best.estAnnualSavings.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-stone-600">
                  Based on your average fleet fuel volume
                </p>
              </div>
            </div>
          </div>

          {/* Programs comparison */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">
                Compare programs
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                Sorted by est. annual savings
              </span>
            </div>
            <ul className="grid gap-px border border-line bg-line lg:grid-cols-2">
              {sorted.map((p) => (
                <ProgramCard key={p.id} program={p} isBest={p.id === best.id} />
              ))}
            </ul>
          </div>

          {/* Savings calculator placeholder */}
          <div className="border border-line bg-surface">
            <header className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Savings calculator
              </h2>
              <Calculator className="h-4 w-4 text-stone-400" />
            </header>
            <div className="p-6">
              <p className="text-sm text-stone-700">
                Your projected savings are calculated against an estimated 45,000
                annual gallons across your fleet, derived from your power-unit
                count and operating geography.
              </p>
              <p className="mt-3 text-sm text-stone-700">
                To refine the calculator, connect a fuel-card statement or update
                your monthly fuel volume in Settings.
              </p>
            </div>
          </div>
        </div>
      </section>
      </MockSection>
    </>
  );
}

function ProgramCard({
  program,
  isBest,
}: {
  program: FuelProgram;
  isBest: boolean;
}) {
  return (
    <li className="bg-surface p-6">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center border border-orange-200 bg-orange-50 text-orange-700">
          <Fuel className="h-4 w-4" />
        </span>
        {isBest && (
          <span className="inline-flex items-center border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
            Best savings
          </span>
        )}
      </div>

      <h3 className="font-display mt-4 text-xl text-stone-900">
        {program.programName}
      </h3>
      <p className="mt-1 text-xs text-stone-500">{program.network}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-stone-500">Per-gallon off</dt>
          <dd className="font-mono text-base text-stone-900">
            ${program.perGallonOff.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">Rebate</dt>
          <dd className="font-mono text-base text-stone-900">
            {program.rebatePercent.toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">Min. monthly gallons</dt>
          <dd className="font-mono text-stone-800">
            {program.monthlyMinimumGallons || "None"}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">Est. annual savings</dt>
          <dd className="font-mono text-stone-900">
            ${program.estAnnualSavings.toLocaleString()}
          </dd>
        </div>
      </dl>

      <ul className="mt-4 space-y-1.5 text-xs">
        <Capability label="Driver controls" enabled={program.driverControls} />
        <Capability label="Fraud controls" enabled={program.fraudControls} />
      </ul>

      <button className="mt-5 inline-flex w-full items-center justify-center gap-1.5 bg-orange-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700">
        Apply for this program
      </button>
    </li>
  );
}

function Capability({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <li className="flex items-center gap-2 text-stone-700">
      {enabled ? (
        <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />
      ) : (
        <X className="h-3 w-3 text-stone-400" />
      )}
      {label}
    </li>
  );
}
