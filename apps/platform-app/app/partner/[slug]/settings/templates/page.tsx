import { getPartnerConfig } from "@/lib/factor-documents/queries";
import SettingsTemplatesForm from "@/components/partner/SettingsTemplatesForm";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Template Settings · ${slug} — Licensed to Haul` };
}

export default async function PartnerTemplatesSettingsPage({ params }: Props) {
  const { slug } = await params;

  const config = await getPartnerConfig(slug).catch(() => null);

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-line bg-white px-6 py-6">
        <h1 className="font-display text-2xl text-stone-900">Document Templates</h1>
        <p className="mt-1 text-sm text-stone-500">
          Configure the Documenso template IDs for each agreement type.
        </p>
      </div>

      <div className="mx-auto max-w-[600px] px-6 py-8">
        <div className="border border-line bg-white p-6">
          <SettingsTemplatesForm factorSlug={slug} initialConfig={config} />
        </div>
      </div>
    </div>
  );
}
