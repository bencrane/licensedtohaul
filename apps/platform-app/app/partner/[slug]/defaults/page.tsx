import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import DefaultsForm from "@/components/partner-defaults/DefaultsForm";
import { loadDefaultsForOrg } from "@/lib/partner-defaults/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Defaults · ${slug} — Licensed to Haul` };
}

export default async function DefaultsPage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();
  const defaults = await loadDefaultsForOrg(slug);

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Defaults"
        description="Set once. Inherited by every audience you compose. Hard exclusions, floors, hazmat preference, default fulfillment window — the global stuff that rarely changes."
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          <DefaultsForm slug={slug} initial={defaults} />
        </div>
      </section>
    </>
  );
}
