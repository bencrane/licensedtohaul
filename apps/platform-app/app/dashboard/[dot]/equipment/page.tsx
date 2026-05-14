import { notFound } from "next/navigation";
import { Cog, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import RequestEquipmentOffersButton from "@/components/dashboard/RequestEquipmentOffersButton";
import { getMockOpportunities } from "@/lib/mock-opportunities";
import type { EquipmentOffer } from "@/lib/mock-opportunities";
import { MockSection } from "@/components/MockSection";

type Props = {
  params: Promise<{ dot: string }>;
};

const TYPE_STYLES = {
  purchase: { label: "Purchase", chip: "border-stone-300 bg-stone-100 text-stone-700" },
  "lease-to-own": { label: "Lease-to-own", chip: "border-sky-200 bg-sky-50 text-sky-800" },
  refinance: { label: "Refinance", chip: "border-orange-200 bg-orange-50 text-orange-800" },
} as const;

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Equipment · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function EquipmentPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const opps = getMockOpportunities();
  const { equipment } = opps;

  return (
    <>
      <PageHeader
        eyebrow="Equipment"
        title="Tractor and trailer financing."
        description="Financing offers from lenders that approve small fleets and owner-operators. Soft pulls only at the qualification stage. Hard pull triggered after term sheet acceptance."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Cog className="h-3.5 w-3.5 text-stone-400" />
              {equipment.availableOffers.length} financing offers
            </span>
            <span className="inline-flex items-center gap-1.5">
              {equipment.currentNotes.length} active equipment {equipment.currentNotes.length === 1 ? "note" : "notes"}
            </span>
          </>
        }
        actions={<RequestEquipmentOffersButton />}
      />

      <MockSection tooltip="Equipment integration not yet wired">
      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
          {/* Current notes — refinance opportunity callout */}
          {equipment.currentNotes.length > 0 && (
            <div>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-2xl text-stone-900">
                  Your current equipment notes
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                  Refinance available on {equipment.currentNotes.filter((n) => n.apr > 9).length}
                </span>
              </div>
              <div className="overflow-x-auto border border-line bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-stone-50/60 text-left">
                      <Th>Unit</Th>
                      <Th>Lender</Th>
                      <Th align="right">Balance</Th>
                      <Th align="right">APR</Th>
                      <Th align="right">Months left</Th>
                      <Th align="right">Refinance</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.currentNotes.map((n) => (
                      <tr key={n.unitNumber} className="border-b border-line last:border-b-0 hover:bg-stone-50/40">
                        <td className="px-4 py-3 font-mono text-stone-900">
                          {n.unitNumber}
                        </td>
                        <td className="px-4 py-3 text-stone-800">{n.lender}</td>
                        <td className="px-4 py-3 text-right font-mono text-stone-900">
                          ${n.balanceUsd.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-mono ${n.apr > 10 ? "text-amber-700" : "text-stone-800"}`}
                          >
                            {n.apr.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-stone-700">
                          {n.termsRemainingMonths}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {n.apr > 9 ? (
                            <button className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-800">
                              <RefreshCw className="h-3 w-3" />
                              See offers
                            </button>
                          ) : (
                            <span className="text-xs text-stone-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                <p>
                  PU-05 is at 11.20% APR. The Crestmark refinance offer below
                  drops it to 7.85% — projected savings of ~$8,400 over the
                  remaining term.
                </p>
              </div>
            </div>
          )}

          {/* Available offers */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-stone-900">
                Available offers
              </h2>
              <div className="flex gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                <button className="border border-line-strong bg-white px-2.5 py-1 text-stone-700">
                  All
                </button>
                <button className="px-2.5 py-1 hover:text-stone-700">Purchase</button>
                <button className="px-2.5 py-1 hover:text-stone-700">Lease-to-own</button>
                <button className="px-2.5 py-1 hover:text-stone-700">Refinance</button>
              </div>
            </div>
            <ul className="grid gap-px border border-line bg-line lg:grid-cols-2">
              {equipment.availableOffers.map((o) => (
                <OfferCard key={o.id} offer={o} />
              ))}
            </ul>
          </div>
        </div>
      </section>
      </MockSection>
    </>
  );
}

function OfferCard({ offer }: { offer: EquipmentOffer }) {
  const t = TYPE_STYLES[offer.type];
  const monthlyPayment = monthlyAmortization(offer.amountUsd, offer.apr, offer.termMonths);

  return (
    <li className="bg-surface p-6">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${t.chip}`}
        >
          {t.label}
        </span>
        {offer.softPullStage && (
          <span className="inline-flex items-center border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
            Soft pull only
          </span>
        )}
      </div>

      <h3 className="font-display mt-4 text-xl text-stone-900">
        {offer.lenderName}
      </h3>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-stone-500">Amount</dt>
          <dd className="font-mono text-base text-stone-900">
            ${offer.amountUsd.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">APR</dt>
          <dd className="font-mono text-base text-stone-900">
            {offer.apr.toFixed(2)}%
          </dd>
        </div>
        <div>
          <dt className="text-stone-500">Term</dt>
          <dd className="font-mono text-stone-800">{offer.termMonths} months</dd>
        </div>
        <div>
          <dt className="text-stone-500">Monthly</dt>
          <dd className="font-mono text-stone-800">
            ${monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-stone-500">Prepayment penalty</dt>
          <dd className="text-stone-800">
            {offer.prepaymentPenalty ? "Yes" : "None"}
          </dd>
        </div>
      </dl>

      {offer.notes && (
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-stone-600">
          {offer.notes}
        </p>
      )}

      <button className="mt-5 inline-flex w-full items-center justify-center gap-1.5 bg-orange-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700">
        Request term sheet
      </button>
    </li>
  );
}

function monthlyAmortization(principal: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
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
