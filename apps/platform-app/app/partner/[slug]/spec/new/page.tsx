import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import SpecForm from "@/components/audience-specs/SpecForm";
import { createSpec } from "@/lib/audience-specs/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `New spec · ${slug} — Licensed to Haul` };
}

export default async function NewSpecPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const action = createSpec.bind(null, slug);

  return (
    <>
      <PageHeader
        eyebrow="New spec"
        title="Compose a new audience spec."
        description="Define criteria for the carriers you want, exclusions for what to filter out, plus your budget cap and price per qualified transfer."
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
          <SpecForm action={action} submitLabel="Create spec" />
        </div>
      </section>
    </>
  );
}
