import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Sliders } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { listSpecsForOrg } from "@/lib/audience-specs/actions";
import type { AudienceSpec, Status } from "@/lib/audience-specs/types";

type Props = {
  params: Promise<{ slug: string }>;
};

const STATUS_STYLES: Record<Status, string> = {
  draft: "border-stone-300 bg-stone-100 text-stone-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  paused: "border-amber-200 bg-amber-50 text-amber-800",
  archived: "border-stone-200 bg-stone-50 text-stone-500",
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Audience specs · ${slug} — Licensed to Haul` };
}

export default async function SpecListPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const specs = await listSpecsForOrg(slug);

  const isEmpty = specs.length === 0;

  return (
    <>
      <PageHeader
        eyebrow="Audience"
        title="Audience specs"
        description="Criteria, exclusions, budget cap, and price per qualified transfer for each outbound effort. Active specs feed your transfer inbox."
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-stone-400" />
            {specs.length} spec{specs.length === 1 ? "" : "s"}
          </span>
        }
        actions={
          isEmpty ? null : (
            <Link
              href={`/partner/${slug}/spec/new`}
              className="inline-flex items-center gap-2 bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              New spec
            </Link>
          )
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          {isEmpty ? (
            <EmptyState slug={slug} />
          ) : (
            <ul className="grid gap-3">
              {specs.map((s) => (
                <SpecRow key={s.id} slug={slug} spec={s} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function EmptyState({ slug }: { slug: string }) {
  return (
    <div className="mx-auto max-w-md border border-line bg-surface px-7 py-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
        No specs yet
      </p>
      <h2 className="font-display mt-1.5 text-xl text-stone-900">
        Compose your first audience spec.
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-stone-600">
        Define the carrier criteria you want, anything to exclude, and your
        budget and price per qualified transfer.
      </p>
      <Link
        href={`/partner/${slug}/spec/new`}
        className="mt-5 inline-flex items-center gap-2 bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
      >
        <Plus className="h-4 w-4" />
        Create a spec
      </Link>
    </div>
  );
}

function SpecRow({ slug, spec }: { slug: string; spec: AudienceSpec }) {
  const criteria = spec.criteria;
  const summaryParts: string[] = [];
  if (criteria.domicile_states?.length)
    summaryParts.push(`${criteria.domicile_states.length} state${criteria.domicile_states.length === 1 ? "" : "s"}`);
  if (criteria.equipment_classes?.length)
    summaryParts.push(`${criteria.equipment_classes.length} equip class${criteria.equipment_classes.length === 1 ? "" : "es"}`);
  if (criteria.fleet_size_min != null || criteria.fleet_size_max != null)
    summaryParts.push(
      `fleet ${criteria.fleet_size_min ?? "·"}–${criteria.fleet_size_max ?? "·"} PU`,
    );
  if (criteria.authority_age_years_min != null)
    summaryParts.push(`≥${criteria.authority_age_years_min}y authority`);
  if (criteria.hazmat && criteria.hazmat !== "either")
    summaryParts.push(`hazmat ${criteria.hazmat}`);

  return (
    <li>
      <Link
        href={`/partner/${slug}/spec/${spec.id}`}
        className="grid grid-cols-12 gap-4 border border-line bg-surface px-5 py-4 transition-colors hover:border-orange-300 hover:bg-stone-50/40"
      >
        <div className="col-span-12 md:col-span-5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[spec.status]}`}
            >
              {spec.status}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
              Updated {new Date(spec.updated_at).toLocaleDateString()}
            </span>
          </div>
          <h3 className="font-display mt-1.5 text-lg text-stone-900">{spec.name}</h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {summaryParts.length ? summaryParts.join(" · ") : "No criteria yet"}
          </p>
        </div>
        <div className="col-span-6 md:col-span-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            Budget cap
          </p>
          <p className="mt-1 font-mono text-sm text-stone-900">
            {spec.budget_cap_cents != null
              ? `$${(spec.budget_cap_cents / 100).toLocaleString()}`
              : "—"}
          </p>
        </div>
        <div className="col-span-6 md:col-span-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            Price per transfer
          </p>
          <p className="mt-1 font-mono text-sm text-stone-900">
            {spec.price_per_transfer_cents != null
              ? `$${(spec.price_per_transfer_cents / 100).toLocaleString()}`
              : "—"}
          </p>
        </div>
      </Link>
    </li>
  );
}
