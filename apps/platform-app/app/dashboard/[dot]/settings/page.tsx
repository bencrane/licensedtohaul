import { notFound } from "next/navigation";
import {
  User,
  Download,
  Trash2,
  KeyRound,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import NotificationPreferenceRow from "@/components/dashboard/NotificationPreferenceRow";
import DataPartnerLog from "@/components/dashboard/DataPartnerLog";
import { getDashboard } from "@/lib/dashboard-fetch";
import { MockSection } from "@/components/MockSection";

type Props = {
  params: Promise<{ dot: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { dot } = await params;
  return { title: `Settings · USDOT ${dot.replace(/\D/g, "")} — Licensed to Haul` };
}

export default async function SettingsPage({ params }: Props) {
  const { dot } = await params;
  const cleanDot = dot.replace(/\D/g, "");
  if (!cleanDot) notFound();

  const data = await getDashboard(cleanDot);
  const { carrier, notificationPreferences } = data;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Account, notifications, privacy."
        description="Most settings are tied to your authority. Address, phone, and email update from your MCS-150 filing — change them at the source and they refresh here."
      />

      <section className="flex-1 bg-background">
        <div className="mx-auto max-w-[1400px] space-y-12 px-6 py-8">
            {/* Account */}
            <Section id="account" title="Account">
              <div className="grid gap-px border border-line bg-line lg:grid-cols-2">
                <Field label="Legal name" value={carrier.legalName} />
                {carrier.dba && <Field label="DBA" value={carrier.dba} />}
                <Field label="USDOT" value={carrier.dotNumber} mono />
                <Field label="MC docket" value={carrier.mcNumber} mono />
                <Field
                  label="Legal address"
                  value={`${carrier.legalAddress.street}, ${carrier.legalAddress.city}, ${carrier.legalAddress.state} ${carrier.legalAddress.zip}`}
                />
                <Field label="Phone" value={carrier.phone} />
                <Field label="Email on file" value={carrier.emailOnFile} />
                <Field label="Domicile state" value={carrier.domicileState} />
              </div>
              <p className="mt-4 text-xs text-stone-500">
                Need to update legal name, address, or phone? File an MCS-150
                update from the{" "}
                <a
                  href={`/dashboard/${cleanDot}/compliance`}
                  className="font-medium text-orange-700 hover:text-orange-800"
                >
                  Compliance page
                </a>
                .
              </p>
            </Section>

            {/* Notifications */}
            <Section
              id="notifications"
              title="Notifications"
              description="Cadence per category. Default is to email when something matters and stay quiet otherwise."
            >
              <MockSection tooltip="Notification preferences not yet persisted">
                <div className="border border-line bg-surface px-6 py-2">
                  {notificationPreferences.map((p) => (
                    <NotificationPreferenceRow key={p.category} preference={p} />
                  ))}
                </div>
              </MockSection>
              <p className="mt-4 text-xs text-stone-500">
                Inbox archive lives at{" "}
                <a
                  href={`/dashboard/${cleanDot}/inbox`}
                  className="font-medium text-orange-700 hover:text-orange-800"
                >
                  /inbox
                </a>
                . Every email we send shows up there even if you have a category
                set to Off (you'll just stop receiving them by email).
              </p>
            </Section>

            {/* Sign in & security */}
            <Section
              id="security"
              title="Sign in & security"
              description="Email + magic link is the default. Add a recovery contact and two-factor for sensitive operations."
            >
              <div className="space-y-px border border-line bg-line">
                <SecurityRow
                  icon={<KeyRound className="h-4 w-4" />}
                  title="Sign-in email"
                  status={carrier.emailOnFile}
                  action="Change"
                />
                <SecurityRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Two-factor authentication"
                  status="Not enabled"
                  statusTone="warn"
                  action="Enable"
                />
                <SecurityRow
                  icon={<User className="h-4 w-4" />}
                  title="Recovery contact"
                  status="Not set"
                  statusTone="warn"
                  action="Add contact"
                />
              </div>
            </Section>

            {/* Privacy & data */}
            <Section
              id="privacy"
              title="Privacy & data"
              description="Your USDOT is public federal information; everything we built on top of it is yours. Export or delete at any time."
            >
              <div className="space-y-3">
                <ActionCard
                  icon={<Download className="h-4 w-4 text-stone-600" />}
                  title="Export your data"
                  description="One-click download of your profile, compliance history, safety records, fleet roster, inbox, and notification preferences. JSON + PDF formats. Delivered to your email."
                  actionLabel="Request export"
                />
                <div className="border border-line bg-surface">
                  <div className="flex items-start gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3 lg:items-center">
                      <span className="inline-flex h-8 w-8 flex-none items-center justify-center border border-line bg-stone-50">
                        <ExternalLink className="h-4 w-4 text-stone-600" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">Data partners</p>
                        <p className="mt-1 text-xs leading-relaxed text-stone-600 md:max-w-2xl">
                          See exactly which operators (factors, lenders, insurance brokers) have received a quote request from you and the data fields they received. Revoke access for any partner.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-line px-5 pb-5">
                    <h2 className="font-display text-2xl text-stone-900 sr-only">Data partners access log</h2>
                    <DataPartnerLog />
                  </div>
                </div>
                <ActionCard
                  icon={<Trash2 className="h-4 w-4 text-red-600" />}
                  title="Delete account"
                  description="Removes your profile, history, and notification preferences. Your USDOT stays public federal information (it always was). Cannot be undone."
                  actionLabel="Delete account"
                  destructive
                />
              </div>
            </Section>
        </div>
      </section>
    </>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <header className="mb-4">
        <h2 className="font-display text-2xl text-stone-900">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-stone-600">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p
        className={`mt-1 ${mono ? "font-mono text-sm text-stone-900" : "text-sm text-stone-800"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SecurityRow({
  icon,
  title,
  status,
  statusTone = "neutral",
  action,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  statusTone?: "neutral" | "warn";
  action: string;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-3 bg-surface px-5 py-4">
      <div className="col-span-1 flex items-center justify-center text-stone-500">
        {icon}
      </div>
      <div className="col-span-6">
        <p className="text-sm font-medium text-stone-900">{title}</p>
        <p
          className={`text-xs ${statusTone === "warn" ? "text-amber-700" : "text-stone-500"}`}
        >
          {status}
        </p>
      </div>
      <div className="col-span-5 text-right">
        <button
          type="button"
          className="text-sm font-medium text-orange-700 hover:text-orange-800"
        >
          {action}
        </button>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  actionLabel,
  destructive,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  destructive?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 border bg-surface p-5 lg:flex-row lg:items-center lg:justify-between ${
        destructive ? "border-red-200" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3 lg:items-center">
        <span className="inline-flex h-8 w-8 flex-none items-center justify-center border border-line bg-stone-50">
          {icon}
        </span>
        <div>
          <p
            className={`text-sm font-semibold ${destructive ? "text-red-800" : "text-stone-900"}`}
          >
            {title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600 md:max-w-2xl">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        className={`whitespace-nowrap border px-3 py-2 text-sm font-medium transition-colors lg:flex-shrink-0 ${
          destructive
            ? "border-red-300 bg-white text-red-700 hover:bg-red-50"
            : "border-line-strong bg-white text-stone-800 hover:border-orange-400 hover:text-orange-700"
        }`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
