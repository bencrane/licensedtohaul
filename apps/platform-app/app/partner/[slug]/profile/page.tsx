import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import FactorProfileForm from "@/components/partner-dashboard/FactorProfileForm";
import { getFactorProfileBySlug } from "@/lib/factor-profiles/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Factor Profile · ${slug} — Licensed to Haul` };
}

export default async function FactorProfilePage({ params }: Props) {
  const { slug } = await params;
  if (!slug) notFound();

  const profile = await getFactorProfileBySlug(slug);

  return (
    <>
      <PageHeader
        eyebrow="Factor profile"
        title="Your intake criteria &amp; terms"
        description="Configure which carriers you fund, your advance rate, factoring rate, and the copy carriers see on their financing page."
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[900px] px-6 py-8">
          <FactorProfileForm slug={slug} profile={profile} />
        </div>
      </section>
    </>
  );
}
