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
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                USDOT
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-5xl leading-none text-stone-900 md:text-6xl">
                  {carrier.dotNumber}
                </p>
                <button
                  type="button"
                  className="rounded p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                  aria-label="Copy USDOT number"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="md:pb-1">
              <p className="font-display text-xl text-stone-900">
                {carrier.legalName}
              </p>
              {carrier.dba && (
                <p className="text-sm text-stone-500">DBA {carrier.dba}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                  Authority granted {carrier.authorityGranted}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-stone-400" />
                  {carrier.domicileState}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono">
                  {carrier.authorityTypes.join(" · ")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:items-end">
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
