import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import TransferInbox from "@/components/partner-dashboard/TransferInbox";
import { listTransfersForOrg } from "@/lib/transfers/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Transfer inbox · ${slug} — Licensed to Haul` };
}

export default async function TransfersPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const transfers = await listTransfersForOrg(slug);
  const newCount = transfers.filter((t) => t.disposition === "new").length;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Transfer inbox"
        description="Every carrier your active specs have delivered. Open one to message the carrier and update where it sits in your pipeline."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
              </span>
              {newCount} awaiting first contact
            </span>
            <span className="inline-flex items-center gap-1.5">
              {transfers.length} transfers in window
            </span>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <TransferInbox slug={slug} transfers={transfers} />
        </div>
      </section>
    </>
  );
}
