import { notFound } from "next/navigation";
import { Download, ListFilter } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import TransferInbox from "@/components/partner-dashboard/TransferInbox";
import { getMockPartner } from "@/lib/mock-partner";

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
  const data = getMockPartner(slug);

  const newCount = data.transfers.filter((t) => t.disposition === "new").length;

  return (
    <>
      <PageHeader
        eyebrow="Transfer inbox"
        title="Every transfer in your delivery window."
        description="Filter by disposition, owner, equipment class, geography. Bulk-disposition and export. Each card shows why the carrier fit your spec and the federal-data signals that triggered the route."
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
              {data.transfers.length} transfers received · target {data.agreement.transferTarget}
            </span>
          </>
        }
        actions={
          <>
            <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
              <ListFilter className="h-4 w-4" />
              Filter
            </button>
            <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <TransferInbox transfers={data.transfers} />
        </div>
      </section>
    </>
  );
}
