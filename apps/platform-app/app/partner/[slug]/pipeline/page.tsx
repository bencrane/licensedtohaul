import { notFound } from "next/navigation";
import { getPipelineCarriers } from "@/lib/pipeline/queries";
import { computeCarrierStage } from "@/lib/pipeline/stage";
import type { CarrierStage, PipelineCarrierRow } from "@/lib/pipeline/stage";
import StageColumn from "@/components/pipeline/StageColumn";

type Props = {
  params: Promise<{ slug: string }>;
};

const STAGE_ORDER: CarrierStage[] = ["onboarding", "active", "quiet", "offboarded"];

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Carrier Lifecycle · ${slug} — Licensed to Haul` };
}

export default async function PipelinePage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const carriers = await getPipelineCarriers(slug).catch(() => [] as PipelineCarrierRow[]);

  // Group carriers by lifecycle stage
  const grouped: Record<CarrierStage, PipelineCarrierRow[]> = {
    onboarding: [],
    active: [],
    quiet: [],
    offboarded: [],
  };

  for (const carrier of carriers) {
    const stage = computeCarrierStage(carrier);
    grouped[stage].push(carrier);
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">Carrier Lifecycle</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track each carrier through the onboarding, active, and quiet stages of the carrier lifecycle.
        </p>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {STAGE_ORDER.map((stage) => (
          <div key={stage} className="flex w-64 shrink-0 flex-col">
            <StageColumn
              stage={stage}
              carriers={grouped[stage]}
              factorSlug={slug}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
