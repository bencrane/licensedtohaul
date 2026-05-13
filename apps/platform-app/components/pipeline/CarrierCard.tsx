"use client";

import type { PipelineCarrierRow, CarrierStage } from "@/lib/pipeline/stage";

type Props = {
  carrier: PipelineCarrierRow;
  stage: CarrierStage;
  offboardAction: (formData: FormData) => Promise<void>;
};

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const d =
    typeof dateStr === "string"
      ? new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00Z"))
      : dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CarrierCard({ carrier, stage, offboardAction }: Props) {
  const noaLabel = carrier.noa_state
    ? carrier.noa_state.charAt(0).toUpperCase() + carrier.noa_state.slice(1)
    : "No envelope";

  const days = daysSince(carrier.last_disbursement_at);
  const isOffboarded = stage === "offboarded";

  return (
    <div
      className="rounded border border-stone-200 bg-white p-3 shadow-sm"
      data-carrier-dot={carrier.carrier_dot}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold text-stone-900 truncate">
            {carrier.carrier_dot}
          </p>
          <p className="mt-0.5 truncate text-xs text-stone-500">{carrier.carrier_name}</p>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-400">NOA:</span>
          <span
            className={`text-xs font-medium ${
              carrier.noa_state === "completed"
                ? "text-green-700"
                : carrier.noa_state
                ? "text-amber-700"
                : "text-stone-400"
            }`}
          >
            {noaLabel}
          </span>
        </div>

        {carrier.last_disbursement_at && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-400">Last disbursement:</span>
            <span className="text-xs text-stone-600">
              {formatDate(carrier.last_disbursement_at)}
              {days !== null && days >= 30 && (
                <span className="ml-1 font-medium text-amber-600">({days}d ago)</span>
              )}
            </span>
          </div>
        )}

        {isOffboarded && carrier.revoked_at && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-400">Offboarded:</span>
            <span className="text-xs text-stone-500">{formatDate(carrier.revoked_at)}</span>
          </div>
        )}
      </div>

      {!isOffboarded && (
        <form action={offboardAction} className="mt-2">
          <input
            type="hidden"
            name="carrier_dot"
            value={carrier.carrier_dot}
          />
          <input
            type="hidden"
            name="reason"
            value="Manually offboarded via carrier lifecycle"
          />
          <button
            type="submit"
            className="mt-1 w-full rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            Mark offboarded
          </button>
        </form>
      )}
    </div>
  );
}
