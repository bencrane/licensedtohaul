import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import CatalogFinalize from "@/components/audience-catalog/CatalogFinalize";
import { getTemplate } from "@/lib/audience-templates";

type Props = {
  params: Promise<{ slug: string; templateId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { templateId } = await params;
  const t = getTemplate(templateId);
  return {
    title: t
      ? `${t.name} · catalog — Licensed to Haul`
      : "Audience — Licensed to Haul",
  };
}

export default async function CatalogTemplatePage({ params }: Props) {
  const { slug, templateId } = await params;
  if (!slug || !templateId) notFound();
  const template = getTemplate(templateId);
  if (!template) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title={template.name}
        description="Finalize your order. Adjust transfer count and window. Lock in when it looks right."
        actions={
          <Link
            href={`/partner/${slug}/catalog`}
            className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to catalog
          </Link>
        }
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <CatalogFinalize slug={slug} template={template} />
        </div>
      </section>
    </>
  );
}
