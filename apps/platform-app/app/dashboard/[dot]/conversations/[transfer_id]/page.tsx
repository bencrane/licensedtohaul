import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import CarrierMessageThread from "@/components/dashboard/CarrierMessageThread";
import { getTransferById } from "@/lib/transfers/actions";
import { listMessagesForTransfer } from "@/lib/messages/actions";

type Props = {
  params: Promise<{ dot: string; transfer_id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { transfer_id } = await params;
  const t = await getTransferById(transfer_id);
  return {
    title: t
      ? `${t.contact_snapshot.name} — Licensed to Haul`
      : "Conversation — Licensed to Haul",
  };
}

export default async function CarrierConversationPage({ params }: Props) {
  const { dot, transfer_id } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot || !transfer_id) notFound();

  const transfer = await getTransferById(transfer_id);
  if (!transfer) notFound();

  const messages = await listMessagesForTransfer(transfer_id);
  const cs = transfer.contact_snapshot;

  return (
    <>
      <PageHeader
        eyebrow="Conversation"
        title={cs.name}
        description={`USDOT ${cs.usdot} · ${cs.domicile}`}
        actions={
          <Link
            href={`/dashboard/${cleanDot}/inbox`}
            className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to inbox
          </Link>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[900px] px-6 py-8">
          <CarrierMessageThread
            dot={cleanDot}
            transferId={transfer_id}
            partnerName={cs.name}
            messages={messages}
          />
        </div>
      </section>
    </>
  );
}
