import { notFound } from "next/navigation";
import { Download, FileText, CreditCard, RefreshCw } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockPartner } from "@/lib/mock-partner";

type Props = {
  params: Promise<{ slug: string }>;
};

const STATUS_STYLES = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  due: "border-amber-200 bg-amber-50 text-amber-800",
  draft: "border-stone-200 bg-stone-100 text-stone-700",
} as const;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Billing & agreement · ${slug} — Licensed to Haul` };
}

export default async function BillingPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const data = getMockPartner(slug);
  const { agreement, partner, invoices } = data;

  return (
    <>
      <PageHeader
        eyebrow="Billing & agreement"
        title="Your founding agreement, invoices, and renewal."
        description="Founding pricing is locked here for the lifetime of the account. All invoices for this delivery window and beyond live in one place."
        meta={
          <span className="inline-flex items-center gap-1.5">
            Founding · Cohort 0{partner.cohort}
          </span>
        }
        actions={
          <button className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700">
            <Download className="h-4 w-4" />
            All invoices
          </button>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Agreement summary */}
          <div className="border border-line bg-surface">
            <header className="border-b border-line px-6 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Active agreement
              </h2>
            </header>
            <div className="grid gap-px bg-line md:grid-cols-3">
              <AgreementCell
                label="Signed"
                value={agreement.signed}
                detail={`${agreement.windowDays}-day delivery window`}
              />
              <AgreementCell
                label="Committed"
                value={`$${agreement.totalCommittedUsd.toLocaleString()}`}
                detail={`${agreement.transferTarget} transfers · $${agreement.pricePerTransferUsd}/transfer (locked)`}
              />
              <AgreementCell
                label="Window ends"
                value={agreement.endsOn}
                detail={`${agreement.daysRemaining} days remaining`}
              />
              <AgreementCell
                label="Refund-or-rollover trigger"
                value={agreement.slaRefundOrRolloverAfter}
                detail="Unfulfilled transfers refund or roll forward"
              />
              <AgreementCell
                label="Cohort pricing"
                value="Locked for life"
                detail="Founding-rate carries on every renewal"
              />
              <AgreementCell
                label="Renewal decision"
                value="Open"
                detail="Renewal options available 14 days before window close"
              />
            </div>
          </div>

          {/* Invoices */}
          <div>
            <h2 className="font-display mb-4 text-2xl text-stone-900">Invoices</h2>
            <div className="overflow-x-auto border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-stone-50/60 text-left">
                    <Th>Number</Th>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th align="right">Amount</Th>
                    <Th align="right">Status</Th>
                    <Th align="right">PDF</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-line last:border-b-0 hover:bg-stone-50/40">
                      <td className="px-4 py-3 font-mono text-xs text-stone-700">
                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-stone-400" />
                          {inv.number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-800">{inv.date}</td>
                      <td className="px-4 py-3 text-stone-700">
                        {inv.description}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-stone-900">
                        ${inv.amountUsd.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[inv.status]}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-stone-500 transition-colors hover:text-orange-700">
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment method + renewal */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="border border-line bg-surface">
              <header className="border-b border-line px-5 py-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Payment method
                </h3>
              </header>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 flex-none items-center justify-center border border-line bg-stone-50 text-stone-700">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-mono text-sm text-stone-900">
                      ACH · Bank of America · ••••3417
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Default for invoices over $5,000
                    </p>
                  </div>
                </div>
                <button className="mt-5 text-sm font-medium text-orange-700 hover:text-orange-800">
                  Update method
                </button>
              </div>
            </section>

            <section className="border border-orange-200 bg-orange-50/40">
              <header className="border-b border-orange-200 px-5 py-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-800">
                  Renewal
                </h3>
              </header>
              <div className="p-5">
                <p className="font-display text-lg text-stone-900">
                  Reup at founding-cohort pricing.
                </p>
                <p className="mt-2 text-sm text-stone-700">
                  Your founding-rate of ${agreement.pricePerTransferUsd}/transfer
                  carries to the next window. Renewal options open 14 days before
                  the current window closes.
                </p>
                <button className="mt-5 inline-flex items-center gap-2 bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700">
                  <RefreshCw className="h-4 w-4" />
                  Renew agreement
                </button>
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}

function AgreementCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="font-display mt-2 text-xl text-stone-900">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}
