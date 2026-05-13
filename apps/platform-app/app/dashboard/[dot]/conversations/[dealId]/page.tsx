import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import CarrierMessageThread from "@/components/dashboard/CarrierMessageThread";
import { getTransferById } from "@/lib/transfers/actions";
import { listMessagesForTransfer } from "@/lib/messages/actions";

type Props = {
  params: Promise<{ dot: string; dealId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dealId } = await params;
  const t = await getTransferById(dealId);
  return {
    title: t
      ? `${t.contact_snapshot.name} — Licensed to Haul`
      : "Conversation — Licensed to Haul",
  };
}

export default async function CarrierConversationPage({ params }: Props) {
  const { dot, dealId } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot || !dealId) notFound();

  const transfer = await getTransferById(dealId);
  if (!transfer) notFound();

  const messages = await listMessagesForTransfer(dealId);
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
            transferId={dealId}
            partnerName={cs.name}
            messages={messages}
          />
        </div>
      </section>
    </>
  );
}
