import { notFound } from "next/navigation";
import Link from "next/link";
import { Settings as SettingsIcon } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import InboxView from "@/components/dashboard/InboxView";
import { getMockDashboard } from "@/lib/mock-dashboard";
import { MockSection } from "@/components/MockSection";

type Props = {
  params: Promise<{ dot: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Inbox · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function InboxPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const data = getMockDashboard(cleanDot);
  const unread = data.inbox.filter((m) => !m.read).length;
  const important = data.inbox.filter((m) => m.important).length;

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Every email we sent you."
        description="Notifications archived in one place. We email when something matters and stay quiet otherwise. Adjust cadence per category in Settings."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
              {unread} unread
            </span>
            <span className="inline-flex items-center gap-1.5">
              {important} marked important
            </span>
            <span className="inline-flex items-center gap-1.5">
              {data.inbox.length} total
            </span>
          </>
        }
        actions={
          <Link
            href={`/dashboard/${cleanDot}/settings`}
            className="inline-flex items-center gap-2 border border-line-strong bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700"
          >
            <SettingsIcon className="h-4 w-4" />
            Notification settings
          </Link>
        }
      />

      <MockSection tooltip="Notifications generator not yet built">
        <section className="flex-1 bg-background">
          <div className="mx-auto max-w-[1400px] px-6 py-8">
            <InboxView messages={data.inbox} />
          </div>
        </section>
      </MockSection>
    </>
  );
}
