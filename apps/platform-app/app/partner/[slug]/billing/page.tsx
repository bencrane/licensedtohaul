import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Billing · ${slug} — Licensed to Haul` };
}

export default async function BillingPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Billing & agreement"
        description="Platform fee + percent-of-disbursed billing. Handled off-platform during the founding cohort."
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="border border-line bg-surface px-6 py-8">
            <p className="text-sm leading-relaxed text-stone-600">
              Licensed to Haul charges a platform fee plus a percent of funds
              you disburse to carriers introduced here. This page will surface
              invoice history, current balance, and payment methods once the
              billing pipeline is live. Until then, your account team handles
              billing directly.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
