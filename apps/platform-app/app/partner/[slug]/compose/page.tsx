import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import AudienceComposer from "@/components/audience-composer/AudienceComposer";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Compose audience · ${slug} — Licensed to Haul` };
}

export default async function ComposePage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Market"
        title="Compose audience"
        description="Pick who you want, set your monthly volume and price per transfer, and watch the deal shape in real time. Lock it in when it looks right."
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <AudienceComposer slug={slug} />
        </div>
      </section>
    </>
  );
}
