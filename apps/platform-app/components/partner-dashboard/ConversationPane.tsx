import Link from "next/link";
import { ArrowUpRight, MapPin, Truck, Phone, Mail } from "lucide-react";
import MessageThread from "@/components/partner-dashboard/MessageThread";
import { setTransferDisposition } from "@/lib/transfers/actions";
import type { TransferDisposition, TransferRow } from "@/lib/transfers/types";
import type { Message } from "@/lib/messages/types";

const DISPOSITION_STEPS: { key: TransferDisposition; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

type Props = {
  slug: string;
  transfer: TransferRow;
  messages: Message[];
};

export default function ConversationPane({ slug, transfer, messages }: Props) {
  const cs = transfer.contact_snapshot;
  return (
    <div className="flex h-full flex-col">
      {/* Carrier header strip */}
      <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4">
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight text-stone-900">
            {cs.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-600">
            <span className="font-mono">USDOT {cs.usdot}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-stone-400" />
              {cs.domicile}
            </span>
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3 text-stone-400" />
              {cs.equipment_class} · {cs.power_units} PU
            </span>
            {cs.phone && (
              <a
                href={`tel:${cs.phone}`}
                className="inline-flex items-center gap-1 hover:text-orange-700"
              >
                <Phone className="h-3 w-3 text-stone-400" />
                {cs.phone}
              </a>
            )}
            {cs.email && (
              <a
                href={`mailto:${cs.email}`}
                className="inline-flex items-center gap-1 hover:text-orange-700"
              >
                <Mail className="h-3 w-3 text-stone-400" />
                {cs.email}
              </a>
            )}
          </div>
        </div>
        <Link
          href={`/partner/${slug}/transfers/${transfer.id}`}
          className="inline-flex flex-none items-center gap-1 border border-line-strong bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-700 transition-colors hover:border-orange-400 hover:text-orange-700"
        >
          Open detail
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      {/* Disposition pills */}
      <div className="border-b border-line bg-stone-50/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            Stage
          </p>
          <div className="flex gap-1">
            {DISPOSITION_STEPS.map((step) => {
              const active = transfer.disposition === step.key;
              const action = setTransferDisposition.bind(
                null,
                slug,
                transfer.id,
                step.key,
              );
              return (
                <form key={step.key} action={action}>
                  <button
                    type="submit"
                    disabled={active}
                    className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                      active
                        ? "bg-orange-600 text-white"
                        : "border border-line bg-white text-stone-700 hover:border-orange-400 hover:text-orange-700"
                    }`}
                  >
                    {step.label}
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      </div>

      {/* Thread fills remaining space */}
      <div className="flex-1 overflow-hidden bg-background p-4">
        <MessageThread
          slug={slug}
          transferId={transfer.id}
          carrierName={cs.name}
          messages={messages}
        />
      </div>
    </div>
  );
}
