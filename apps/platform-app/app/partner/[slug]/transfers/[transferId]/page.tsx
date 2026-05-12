import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Truck,
  Mail,
  Phone,
  Check,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import MessageThread from "@/components/partner-dashboard/MessageThread";
import {
  getTransferById,
  setTransferDisposition,
} from "@/lib/transfers/actions";
import { listMessagesForTransfer } from "@/lib/messages/actions";
import type { TransferDisposition } from "@/lib/transfers/types";

type Props = {
  params: Promise<{ slug: string; transferId: string }>;
};

const DISPOSITION_STEPS: { key: TransferDisposition; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export async function generateMetadata({ params }: Props) {
  const { transferId } = await params;
  const t = await getTransferById(transferId);
  return {
    title: t
      ? `${t.contact_snapshot.name} · transfer — Licensed to Haul`
      : "Transfer — Licensed to Haul",
  };
}

export default async function TransferDetailPage({ params }: Props) {
  const { slug, transferId } = await params;
  if (!slug || !transferId) notFound();

  const transfer = await getTransferById(transferId);
  if (!transfer) notFound();

  const messages = await listMessagesForTransfer(transferId);
  const cs = transfer.contact_snapshot;

  return (
    <>
      <PageHeader
        eyebrow="Transfer"
        title={cs.name}
        description={`USDOT ${cs.usdot} · ${cs.domicile} · ${cs.equipment_class}`}
        meta={
          <span className="inline-flex items-center gap-1.5">
            Status · {transfer.disposition}
          </span>
        }
        actions={
          <Link
            href={`/partner/${slug}/transfers`}
            className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to inbox
          </Link>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-8 lg:grid-cols-[1fr_1.4fr]">
          {/* Carrier summary + actions */}
          <aside className="space-y-6">
            <section className="border border-line bg-surface">
              <header className="border-b border-line px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Carrier
                </p>
              </header>
              <div className="space-y-4 px-5 py-5">
                <div>
                  <p className="font-display text-xl text-stone-900">{cs.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-stone-500">
                    USDOT {cs.usdot}
                  </p>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-stone-700">
                    <MapPin className="h-3.5 w-3.5 text-stone-400" />
                    {cs.domicile}
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <Truck className="h-3.5 w-3.5 text-stone-400" />
                    {cs.equipment_class} · {cs.power_units} PU
                  </div>
                  {cs.phone && (
                    <a
                      className="flex items-center gap-2 text-stone-700 hover:text-orange-700"
                      href={`tel:${cs.phone}`}
                    >
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      {cs.phone}
                    </a>
                  )}
                  {cs.email && (
                    <a
                      className="flex items-center gap-2 text-stone-700 hover:text-orange-700"
                      href={`mailto:${cs.email}`}
                    >
                      <Mail className="h-3.5 w-3.5 text-stone-400" />
                      {cs.email}
                    </a>
                  )}
                </dl>
              </div>
            </section>

            <section className="border border-line bg-surface">
              <header className="border-b border-line px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Why this carrier fits your spec
                </p>
              </header>
              <ul className="space-y-2 px-5 py-5 text-sm leading-snug text-stone-700">
                {(transfer.match_criteria as string[]).map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 flex-none text-orange-600"
                      strokeWidth={3}
                    />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border border-line bg-surface">
              <header className="border-b border-line px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Move through the pipeline
                </p>
              </header>
              <div className="grid grid-cols-5 gap-1 p-2">
                {DISPOSITION_STEPS.map((step) => {
                  const active = transfer.disposition === step.key;
                  const action = setTransferDisposition.bind(
                    null,
                    slug,
                    transferId,
                    step.key,
                  );
                  return (
                    <form key={step.key} action={action}>
                      <button
                        type="submit"
                        disabled={active}
                        className={`w-full px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                          active
                            ? "bg-orange-600 text-white"
                            : "bg-stone-50 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        {step.label}
                      </button>
                    </form>
                  );
                })}
              </div>
            </section>
          </aside>

          {/* Conversation */}
          <section>
            <MessageThread
              slug={slug}
              transferId={transferId}
              carrierName={cs.name}
              messages={messages}
            />
          </section>
        </div>
      </section>
    </>
  );
}
