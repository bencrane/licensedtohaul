import { notFound } from "next/navigation";
import { Truck, Users, Plus, Download, MapPin } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getDashboard } from "@/lib/dashboard-fetch";
import type { PowerUnit, Driver } from "@/lib/mock-dashboard";
import { MockText } from "@/components/MockText";
import { MockSection } from "@/components/MockSection";

type Props = {
  params: Promise<{ dot: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Fleet · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function FleetPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const { fleet } = await getDashboard(cleanDot);
  const puDelta = fleet.powerUnitsNow - fleet.powerUnits90dAgo;
  const drDelta = fleet.driversNow - fleet.drivers90dAgo;
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Power units, drivers, equipment."
        description="Roster pulled from your MCS-150 and refreshed against the FMCSA registry. Add or retire units here and the change propagates to your authority record on the next filing."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-stone-400" />
              {fleet.powerUnitsNow} power units ·{" "}
              <MockText tooltip="Snapshot history not yet 90d deep">
                {sign(puDelta)} vs. 90 days ago
              </MockText>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-stone-400" />
              {fleet.driversNow} drivers ·{" "}
              <MockText tooltip="Snapshot history not yet 90d deep">
                {sign(drDelta)} vs. 90 days ago
              </MockText>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-stone-400" />
              Inspected in {fleet.inspectionStates.length} states
            </span>
          </>
        }
        actions={
          <>
            <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700">
              <Plus className="h-4 w-4" />
              Add power unit
            </button>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Power units */}
          <MockSection tooltip="Fleet roster not yet wired to real data">
            <div>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-2xl text-stone-900">
                  Power units
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  {fleet.powerUnitsNow} active
                </span>
              </div>
              <div className="overflow-x-auto border border-line bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-stone-50/60 text-left">
                      <Th>Unit</Th>
                      <Th>Year / make / model</Th>
                      <Th>Class</Th>
                      <Th>VIN</Th>
                      <Th>Plate</Th>
                      <Th align="right">Inspections</Th>
                      <Th align="right">OOS</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleet.powerUnitsRoster.map((u) => (
                      <PowerUnitRow key={u.id} unit={u} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </MockSection>

          {/* Drivers */}
          <MockSection tooltip="Driver roster not yet wired to real data">
            <div>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-2xl text-stone-900">Drivers</h2>
                <button className="text-sm font-medium text-orange-700 hover:text-orange-800">
                  Refresh all MVRs
                </button>
              </div>
              <div className="overflow-x-auto border border-line bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-stone-50/60 text-left">
                      <Th>Name</Th>
                      <Th>CDL</Th>
                      <Th>Hire date</Th>
                      <Th>Hazmat</Th>
                      <Th>MVR last pulled</Th>
                      <Th align="right">Inspections (24mo)</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleet.driversRoster.map((d) => (
                      <DriverRow key={d.id} driver={d} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </MockSection>

          {/* Geographic footprint */}
          <div>
            <h2 className="font-display mb-4 text-2xl text-stone-900">
              Geographic footprint
            </h2>
            <div className="border border-line bg-surface p-6">
              <p className="text-sm text-stone-600">
                States with inspection activity in the last 24 months. Larger footprint
                generally means broader insurance pricing surface.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {fleet.inspectionStates.map((s) => (
                  <span
                    key={s}
                    className="inline-flex h-12 w-12 items-center justify-center border border-line bg-stone-50 font-display text-lg text-stone-900"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
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

function PowerUnitRow({ unit }: { unit: PowerUnit }) {
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-stone-50/40">
      <td className="px-4 py-3 font-mono text-stone-900">{unit.unitNumber}</td>
      <td className="px-4 py-3 text-stone-800">
        {unit.year} {unit.make} {unit.model}
      </td>
      <td className="px-4 py-3 text-stone-700">{unit.equipmentClass}</td>
      <td className="px-4 py-3 font-mono text-xs text-stone-600">{unit.vin}</td>
      <td className="px-4 py-3 font-mono text-xs text-stone-700">
        {unit.plateNumber} · {unit.plateState}
      </td>
      <td className="px-4 py-3 text-right font-mono text-stone-800">
        {unit.inspections24mo}
      </td>
      <td className="px-4 py-3 text-right">
        {unit.oosCount === 0 ? (
          <span className="font-mono text-emerald-700">0</span>
        ) : (
          <span className="inline-flex items-center border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
            {unit.oosCount}
          </span>
        )}
      </td>
    </tr>
  );
}

function DriverRow({ driver }: { driver: Driver }) {
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-stone-50/40">
      <td className="px-4 py-3 text-stone-900">
        {driver.firstName} {driver.lastName}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-stone-700">
        {driver.cdlClass} · {driver.cdlState}
      </td>
      <td className="px-4 py-3 text-stone-700">{driver.hireDate}</td>
      <td className="px-4 py-3">
        {driver.hazmatEndorsed ? (
          <span className="inline-flex items-center border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-800">
            Endorsed
          </span>
        ) : (
          <span className="text-xs text-stone-500">—</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-stone-600">
        {driver.mvrLastPulled}
      </td>
      <td className="px-4 py-3 text-right font-mono text-stone-800">
        {driver.inspections24mo}
      </td>
    </tr>
  );
}
