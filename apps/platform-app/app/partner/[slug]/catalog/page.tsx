import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Truck,
  MapPin,
  Calendar,
  ArrowRight,
  Shield,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import {
  AUDIENCE_TEMPLATES,
  VERTICAL_LABELS,
  type AudienceTemplate,
} from "@/lib/audience-templates";
import {
  calcAudienceSize,
  formatUsd,
  pricePerTransferCents,
} from "@/lib/audience-pricing";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Audience catalog · ${slug} — Licensed to Haul` };
}

export default async function CatalogPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Market"
        title="Catalog"
        description="Pre-composed audiences ready to lock in. Pick one, set your volume and fulfillment window, and start receiving qualified transfers."
        meta={
          <span className="inline-flex items-center gap-1.5">
            {AUDIENCE_TEMPLATES.length} audiences available
          </span>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <ul className="grid gap-4 md:grid-cols-2">
            {AUDIENCE_TEMPLATES.map((t) => (
              <TemplateCard key={t.id} slug={slug} template={t} />
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function TemplateCard({
  slug,
  template: t,
}: {
  slug: string;
  template: AudienceTemplate;
}) {
  const audienceSize = calcAudienceSize({
    states: t.criteria.states,
    equipment: t.criteria.equipment,
    fleetMin: t.criteria.fleetMin,
    fleetMax: t.criteria.fleetMax,
    authorityYearsMin: t.criteria.authorityYearsMin,
    hazmat: t.criteria.hazmat,
  });
  const priceCents = pricePerTransferCents(
    audienceSize,
    t.recommendedFulfillmentDays,
  );
  const minBudgetCents = priceCents * t.minTransferCount;

  return (
    <li>
      <Link
        href={`/partner/${slug}/catalog/${t.id}`}
        className="group flex h-full flex-col border border-line bg-surface transition-colors hover:border-orange-300"
      >
        {/* Top strip — vertical fits */}
        <header className="flex flex-wrap items-center gap-1.5 border-b border-line bg-stone-50/60 px-5 py-2.5">
          {t.verticalFit.map((v) => (
            <span
              key={v}
              className="inline-flex items-center border border-line-strong bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-700"
            >
              {VERTICAL_LABELS[v]}
            </span>
          ))}
        </header>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <h3 className="font-display text-xl leading-tight text-stone-900">
              {t.name}
            </h3>
            <p className="mt-1 text-sm leading-snug text-stone-600">
              {t.tagline}
            </p>
          </div>

          <ul className="space-y-1.5 text-[13px] text-stone-700">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-stone-400" />
              <span className="leading-snug">
                {t.criteria.states.length > 6
                  ? `${t.criteria.states.slice(0, 6).join(", ")} +${t.criteria.states.length - 6}`
                  : t.criteria.states.join(", ")}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Truck className="mt-0.5 h-3.5 w-3.5 flex-none text-stone-400" />
              <span className="leading-snug">
                {t.criteria.equipment.join(" · ")}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-3.5 w-3.5 flex-none items-center justify-center font-mono text-[10px] font-bold text-stone-400">
                #
              </span>
              <span className="leading-snug">
                {t.criteria.fleetMin}–{t.criteria.fleetMax} power units ·{" "}
                {t.criteria.authorityYearsMin === 0
                  ? "any authority age"
                  : `${t.criteria.authorityYearsMin}y+ authority`}
                {t.criteria.hazmat === "required" && " · hazmat required"}
                {t.criteria.hazmat === "excluded" && " · no hazmat"}
              </span>
            </li>
          </ul>

          <div className="mt-auto grid grid-cols-3 gap-px border border-line bg-line">
            <Stat
              label="Audience"
              value={audienceSize.toLocaleString()}
              sub="carriers"
            />
            <Stat
              label="Per transfer"
              value={formatUsd(priceCents)}
              sub="indexed"
            />
            <Stat
              label="Min commit"
              value={formatUsd(minBudgetCents)}
              sub={`${t.minTransferCount} transfers`}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-stone-500">
              <Calendar className="h-3 w-3 text-stone-400" />
              {t.recommendedFulfillmentDays}-day window
            </span>
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-stone-700 transition-colors group-hover:text-orange-700">
              Lock this in
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-stone-500">
        {label}
      </p>
      <p className="font-display mt-0.5 text-base text-stone-900">{value}</p>
      <p className="font-mono text-[10px] text-stone-500">{sub}</p>
    </div>
  );
}
