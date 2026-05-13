import type { PipelineCarrierRow, CarrierStage } from "@/lib/pipeline/stage";
import CarrierCard from "./CarrierCard";
import { markCarrierOffboarded } from "@/lib/pipeline/actions";

const STAGE_LABELS: Record<CarrierStage, string> = {
  onboarding: "Onboarding",
  active: "Active",
  quiet: "Quiet",
  offboarded: "Offboarded",
};

type Props = {
  stage: CarrierStage;
  carriers: PipelineCarrierRow[];
  factorSlug: string;
};

export default function StageColumn({ stage, carriers, factorSlug }: Props) {
  const label = STAGE_LABELS[stage];

  async function offboardAction(formData: FormData) {
    "use server";
    const carrierDot = formData.get("carrier_dot") as string;
    const reason = (formData.get("reason") as string) || "Manually offboarded via carrier lifecycle";
    await markCarrierOffboarded({ carrierDot, factorSlug, reason });
  }

  return (
    <div
      data-stage={stage}
      className="flex min-h-0 flex-1 flex-col rounded-lg border border-stone-200 bg-stone-50"
    >
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-800">{label}</h2>
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
            {carriers.length}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {carriers.length === 0 ? (
          <p className="py-6 text-center text-xs text-stone-400">
            No carriers in {label.toLowerCase()} yet.
          </p>
        ) : (
          carriers.map((carrier) => (
            <CarrierCard
              key={carrier.carrier_dot}
              carrier={carrier}
              stage={stage}
              offboardAction={offboardAction}
            />
          ))
        )}
      </div>
    </div>
  );
}
