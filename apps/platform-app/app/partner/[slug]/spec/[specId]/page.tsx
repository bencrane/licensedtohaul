import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import SpecForm from "@/components/audience-specs/SpecForm";
import { getSpec, updateSpec } from "@/lib/audience-specs/actions";

type Props = {
  params: Promise<{ slug: string; specId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { specId } = await params;
  const spec = await getSpec(specId);
  return {
    title: spec
      ? `${spec.name} · audience spec — Licensed to Haul`
      : "Audience spec — Licensed to Haul",
  };
}

export default async function EditSpecPage({ params }: Props) {
  const { slug, specId } = await params;
  if (!slug || !specId) notFound();

  const spec = await getSpec(specId);
  if (!spec || spec.status === "archived") notFound();

  const action = updateSpec.bind(null, slug, specId);

  return (
    <>
      <PageHeader
        eyebrow="Audience spec"
        title={spec.name}
        description="Edit criteria, exclusions, budget, and price per qualified transfer. Changes take effect immediately."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              Status · {spec.status}
            </span>
            <span className="inline-flex items-center gap-1.5">
              Created {new Date(spec.created_at).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              Updated {new Date(spec.updated_at).toLocaleDateString()}
            </span>
          </>
        }
        actions={
          <Link
            href={`/partner/${slug}/spec`}
            className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to specs
          </Link>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <SpecForm action={action} initial={spec} submitLabel="Save changes" />
        </div>
      </section>
    </>
  );
}
