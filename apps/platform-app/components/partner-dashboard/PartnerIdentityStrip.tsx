import { Calendar, Hash, FileSignature } from "lucide-react";
import type { PartnerProfile, Agreement } from "@/lib/mock-partner";

export default function PartnerIdentityStrip({
  partner,
  agreement,
}: {
  partner: PartnerProfile;
  agreement: Agreement;
}) {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              {partner.verticalLabel}
            </p>
            <h1 className="font-display mt-1 text-4xl leading-tight text-stone-900 md:text-5xl">
              {partner.shortName}
            </h1>
            <p className="mt-2 text-sm text-stone-500">{partner.legalName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1.5">
              <FileSignature className="h-3.5 w-3.5 text-stone-400" />
              Signed {agreement.signed}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-stone-400" />
              Window ends {agreement.endsOn}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-stone-400" />
              Cohort 0{1}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono uppercase tracking-[0.12em] text-emerald-800">
                Active · refreshed {partner.refreshedAt}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
