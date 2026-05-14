import { Copy, MapPin, Calendar } from "lucide-react";
import type { CarrierProfile } from "@/lib/mock-dashboard";

const STATUS_COPY: Record<CarrierProfile["status"], { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  pending: { label: "Pending", tone: "bg-amber-50 border-amber-200 text-amber-800" },
  out_of_service: {
    label: "Out of Service",
    tone: "bg-red-50 border-red-200 text-red-800",
  },
};

export default function IdentityStrip({ carrier }: { carrier: CarrierProfile }) {
  const status = STATUS_COPY[carrier.status];

  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-[1400px] px-6 py-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              USDOT {carrier.dotNumber}
              <button
                type="button"
                className="ml-1.5 rounded p-0.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                aria-label="Copy USDOT number"
              >
                <Copy className="inline-block h-3 w-3" />
              </button>
            </p>
            <h1 className="font-display mt-2 text-3xl leading-tight text-stone-900 text-balance sm:text-4xl">
              {carrier.legalName}
            </h1>
            {carrier.dba && (
              <p className="mt-1 text-sm text-stone-500">DBA {carrier.dba}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-stone-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 flex-none text-stone-400" />
                Authority granted {carrier.authorityGranted}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-none text-stone-400" />
                {carrier.domicileState}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                {carrier.authorityTypes.join(" · ")}
              </span>
            </div>
          </div>

          <div className="flex flex-none flex-col items-start gap-1.5 sm:items-end">
            <span
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${status.tone}`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    carrier.status === "active"
                      ? "bg-emerald-400"
                      : carrier.status === "pending"
                        ? "bg-amber-400"
                        : "bg-red-400"
                  }`}
                />
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                    carrier.status === "active"
                      ? "bg-emerald-500"
                      : carrier.status === "pending"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                />
              </span>
              {status.label}
            </span>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
              Refreshed {carrier.refreshedAt}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
