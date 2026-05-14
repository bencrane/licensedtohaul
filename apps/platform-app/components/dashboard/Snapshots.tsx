import type {
  SafetySnapshot,
  FleetSnapshot,
  ComplianceSnapshot,
  HealthStatus,
} from "@/lib/mock-dashboard";
import { MockText } from "@/components/MockText";

const BASIC_BAR_TONES: Record<HealthStatus, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  alert: "bg-red-500",
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {title}
        </h3>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <div>
        <p className="text-sm text-stone-700">{label}</p>
        {detail && <p className="text-[11px] text-stone-500">{detail}</p>}
      </div>
      <p className="font-mono text-sm text-stone-900">{value}</p>
    </div>
  );
}

export function SafetyCard({ safety }: { safety: SafetySnapshot }) {
  return (
    <Card title="Safety">
      <Row
        label="Crashes (24mo)"
        value={safety.crashes24mo}
        detail={`${safety.crashesOutOfService} out-of-service`}
      />
      <Row
        label="Vehicle inspections"
        value={safety.inspectionsVehicle24mo}
        detail={`${safety.vehicleOosRate.toFixed(1)}% OOS rate`}
      />
      <Row
        label="Driver inspections"
        value={safety.inspectionsDriver24mo}
        detail={`${safety.driverOosRate.toFixed(1)}% OOS rate`}
      />

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          CSA BASICs · percentile
        </p>
        <ul className="mt-3 space-y-2.5">
          {safety.basics.map((b) => (
            <li key={b.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-700">{b.name}</span>
                <span className="font-mono text-stone-900">
                  {b.percentile === null ? "—" : b.percentile}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden bg-stone-100">
                <div
                  className={`h-full ${BASIC_BAR_TONES[b.status]}`}
                  style={{ width: `${b.percentile === null ? 2 : Math.max(2, b.percentile)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function FleetCard({ fleet }: { fleet: FleetSnapshot }) {
  const puDelta = fleet.powerUnitsNow - fleet.powerUnits90dAgo;
  const drDelta = fleet.driversNow - fleet.drivers90dAgo;
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <Card title="Fleet">
      <Row
        label="Power units"
        value={fleet.powerUnitsNow}
        detail={
          <>
            {sign(puDelta)} vs. 90 days ago (
            <MockText tooltip="Snapshot history not yet 90d deep">
              {fleet.powerUnits90dAgo}
            </MockText>
            )
          </>
        }
      />
      <Row
        label="Drivers"
        value={fleet.driversNow}
        detail={
          <>
            {sign(drDelta)} vs. 90 days ago (
            <MockText tooltip="Snapshot history not yet 90d deep">
              {fleet.drivers90dAgo}
            </MockText>
            )
          </>
        }
      />
      <div className="mt-3 border-t border-line pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Geographic footprint
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Inspection activity, last 24 months
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {fleet.inspectionStates.map((s) => (
            <span
              key={s}
              className="inline-flex items-center justify-center border border-line bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-700"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ComplianceCard({
  compliance,
}: {
  compliance: ComplianceSnapshot;
}) {
  return (
    <Card title="Compliance">
      <Row
        label="MCS-150"
        value={compliance.mcs150.filedAt}
        detail={`Next due ${compliance.mcs150.nextDue}`}
      />
      <Row
        label="IFTA"
        value={compliance.ifta.quarter}
        detail={`Due ${compliance.ifta.due}`}
      />
      <Row
        label="IRP"
        value={`${compliance.irp.jurisdictions} jurisdictions`}
        detail={`Renewal due ${compliance.irp.renewalDue}`}
      />
      <Row
        label="D&A consortium"
        value={compliance.daConsortium.status === "enrolled" ? "Enrolled" : "Missing"}
        detail={compliance.daConsortium.name}
      />
      <Row
        label="BOC-3"
        value={compliance.boc3.status === "filed" ? "Filed" : "Missing"}
        detail={compliance.boc3.agent}
      />
      <Row
        label="Biennial filing"
        value={compliance.biennial.lastFiled}
        detail={`Next due ${compliance.biennial.nextDue}`}
      />
    </Card>
  );
}
