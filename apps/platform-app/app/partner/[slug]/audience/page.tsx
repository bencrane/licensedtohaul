import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import { getMockPartner } from "@/lib/mock-partner";
import type { AudienceFacet } from "@/lib/mock-partner";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Audience shape · ${slug} — Licensed to Haul` };
}

export default async function AudiencePage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const data = getMockPartner(slug);
  const { spec, audienceStats } = data;

  return (
    <>
      <PageHeader
        eyebrow="Audience"
        title="Audience shape"
        description="Distribution of carriers matching your active specs. Aggregate only — individual carrier identities are revealed when a carrier transfers to your inbox."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              {spec.audienceSizeNow.toLocaleString()} carriers match
            </span>
            <span className="inline-flex items-center gap-1.5 text-stone-500">
              Identities locked until transfer
            </span>
          </>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FacetCard title="By equipment" facets={audienceStats.byEquipment} />
            <FacetCard title="By state" facets={audienceStats.byState} />
            <FacetCard title="By fleet size" facets={audienceStats.byFleetSize} />
            <FacetCard title="By authority age" facets={audienceStats.byAuthorityAge} />
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-stone-500">
            You see the shape of who&apos;s in your audience, not who they are.
            Carrier names, USDOTs, and contact info are revealed only when a
            carrier transfers to your inbox — protecting the audience pool
            you&apos;re paying to access.
          </p>
        </div>
      </section>
    </>
  );
}

function FacetCard({
  title,
  facets,
}: {
  title: string;
  facets: AudienceFacet[];
}) {
  const total = facets.reduce((sum, f) => sum + f.count, 0);
  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-5 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {title}
        </h3>
      </header>
      <ul className="space-y-3 p-5">
        {facets.map((f) => {
          const pct = (f.count / total) * 100;
          return (
            <li key={f.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-stone-700">{f.label}</span>
                <span className="font-mono text-stone-900">
                  {f.count.toLocaleString()}{" "}
                  <span className="text-stone-500">({pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden bg-stone-100">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
