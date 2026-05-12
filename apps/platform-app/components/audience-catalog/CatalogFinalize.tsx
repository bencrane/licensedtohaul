'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { composeAndLockSpec } from '@/lib/audience-specs/compose-action';
import {
  FULFILLMENT_OPTIONS,
  calcAudienceSize,
  calcDaysToFill,
  formatUsd,
  pricePerTransferCents,
} from '@/lib/audience-pricing';
import type { AudienceTemplate } from '@/lib/audience-templates';

type Props = {
  slug: string;
  template: AudienceTemplate;
};

export default function CatalogFinalize({ slug, template }: Props) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [transferCount, setTransferCount] = useState(
    template.recommendedTransferCount,
  );
  const [fulfillmentDays, setFulfillmentDays] = useState<number>(
    template.recommendedFulfillmentDays,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const audienceSize = useMemo(
    () => calcAudienceSize(template.criteria),
    [template],
  );
  const priceCents = useMemo(
    () => pricePerTransferCents(audienceSize, fulfillmentDays),
    [audienceSize, fulfillmentDays],
  );
  const dailySupply = audienceSize * 0.01;
  const daysToFill = useMemo(
    () => calcDaysToFill(audienceSize, transferCount),
    [audienceSize, transferCount],
  );
  const totalCommitmentCents = transferCount * priceCents;
  const onTrack = daysToFill <= fulfillmentDays;
  const capacityInWindow = Math.floor(dailySupply * fulfillmentDays);

  const belowMin = transferCount < template.minTransferCount;

  const handleLock = () => {
    setError(null);
    if (belowMin) {
      setError(
        `Minimum order for this audience is ${template.minTransferCount} transfers.`,
      );
      return;
    }
    startTransition(async () => {
      const result = await composeAndLockSpec(slug, {
        name,
        criteria: {
          domicile_states: template.criteria.states,
          equipment_classes: template.criteria.equipment,
          fleet_size_min: template.criteria.fleetMin,
          fleet_size_max: template.criteria.fleetMax,
          authority_age_years_min: template.criteria.authorityYearsMin,
          hazmat: template.criteria.hazmat,
          safety_ratings: ['satisfactory'],
          notes: `Started from catalog template: ${template.id}`,
        },
        transfer_count_target: transferCount,
        fulfillment_window_days: fulfillmentDays,
        price_per_transfer_cents: priceCents,
      });
      if (result.ok) {
        router.push(`/partner/${slug}/spec/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Left — read-only criteria summary */}
      <div className="space-y-4">
        <div className="border border-line bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            What you&apos;re getting
          </p>
          <h2 className="font-display mt-1 text-2xl leading-tight text-stone-900">
            {template.tagline}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            {template.description}
          </p>
        </div>

        <div className="border border-line bg-surface">
          <header className="border-b border-line px-5 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
              Carrier criteria — locked
            </p>
          </header>
          <dl className="divide-y divide-line">
            <CriteriaRow
              label="Domicile states"
              value={template.criteria.states.join(', ')}
            />
            <CriteriaRow
              label="Equipment classes"
              value={template.criteria.equipment.join(' · ')}
            />
            <CriteriaRow
              label="Fleet size"
              value={`${template.criteria.fleetMin}–${template.criteria.fleetMax} power units`}
            />
            <CriteriaRow
              label="Authority age"
              value={
                template.criteria.authorityYearsMin === 0
                  ? 'Any'
                  : `${template.criteria.authorityYearsMin} years minimum`
              }
            />
            <CriteriaRow
              label="Hazmat"
              value={
                template.criteria.hazmat === 'required'
                  ? 'Required'
                  : template.criteria.hazmat === 'excluded'
                    ? 'Excluded'
                    : 'No preference'
              }
            />
          </dl>
        </div>

        <div className="border border-line bg-stone-50/60 p-5">
          <p className="text-[11px] leading-relaxed text-stone-600">
            Need different criteria? You can{' '}
            <Link
              href={`/partner/${slug}/compose`}
              className="font-medium text-orange-700 underline-offset-2 hover:underline"
            >
              build a custom audience in Compose
            </Link>{' '}
            instead. This catalog audience is locked — pick a different one
            from the list if these criteria aren&apos;t a fit.
          </p>
        </div>
      </div>

      {/* Right — order + lock */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="border border-line bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Your rate
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="font-display text-4xl text-stone-900">
              {formatUsd(priceCents)}
            </p>
            <p className="text-sm text-stone-500">per qualified transfer</p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
            Indexed to audience scarcity. Pick a shorter window for priority
            delivery — small premium applies.
          </p>
        </div>

        <div className="border border-line bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Order
          </p>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <label className="text-sm text-stone-700">
                Transfers to deliver
              </label>
              <span className="font-display text-2xl text-stone-900">
                {transferCount}
              </span>
            </div>
            <input
              type="range"
              min={template.minTransferCount}
              max={Math.max(300, template.minTransferCount * 4)}
              step={5}
              value={transferCount}
              onChange={(e) => setTransferCount(Number(e.target.value))}
              className="mt-2 h-1.5 w-full accent-orange-600"
            />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-stone-500">
              Minimum {template.minTransferCount} for this audience
            </p>
          </div>

          <div className="mt-5">
            <p className="text-sm text-stone-700">Fulfillment window</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {FULFILLMENT_OPTIONS.map((d) => {
                const on = fulfillmentDays === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFulfillmentDays(d)}
                    className={`px-3 py-2 text-sm font-semibold transition-colors ${
                      on
                        ? 'bg-orange-600 text-white'
                        : 'border border-line bg-white text-stone-700 hover:border-orange-300'
                    }`}
                  >
                    {d} days
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={`border p-6 ${
            onTrack
              ? 'border-orange-300 bg-orange-50/30'
              : 'border-amber-300 bg-amber-50/50'
          }`}
        >
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 flex-none text-orange-600" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-800">
                Your deal
              </p>
              <p className="font-display mt-1 text-2xl leading-tight text-stone-900">
                {transferCount} qualified transfers at {formatUsd(priceCents)}{' '}
                each. Delivered in {fulfillmentDays} days or we refund.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <DealStat
                  label="Total commitment"
                  value={formatUsd(totalCommitmentCents)}
                />
                <DealStat
                  label="Estimated delivery"
                  value={
                    daysToFill === Infinity || daysToFill > 365
                      ? '—'
                      : `${daysToFill}d`
                  }
                />
                <DealStat
                  label="Window capacity"
                  value={`~${capacityInWindow.toLocaleString()}`}
                />
                <DealStat
                  label="Daily supply"
                  value={`~${dailySupply.toFixed(1)}/day`}
                />
              </div>

              {!onTrack && (
                <p className="mt-4 border-l-2 border-amber-500 bg-amber-100/60 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
                  Your audience supplies roughly{' '}
                  <strong>{capacityInWindow.toLocaleString()}</strong>{' '}
                  qualified carriers in {fulfillmentDays} days, but you&apos;ve
                  ordered <strong>{transferCount}</strong>. Pick a longer
                  window or lower the count.
                </p>
              )}
              {onTrack && (
                <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                  ✓ On track to deliver within {fulfillmentDays} days
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border border-line bg-surface p-5">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
              Name this audience
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full border border-line bg-background px-3 py-2 text-[15px] text-stone-900 focus:border-orange-500 focus:outline-none"
            />
          </label>

          <button
            type="button"
            disabled={pending || !name.trim() || belowMin}
            onClick={handleLock}
            className="group mt-4 inline-flex w-full items-center justify-center gap-2 bg-orange-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {pending
              ? 'Locking in…'
              : `Lock in ${transferCount} transfers · ${formatUsd(totalCommitmentCents)}`}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          {error && (
            <p
              className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CriteriaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-5 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
        {label}
      </dt>
      <dd className="col-span-2 text-sm text-stone-800">{value}</dd>
    </div>
  );
}

function DealStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="font-display mt-1 text-xl text-stone-900">{value}</p>
    </div>
  );
}
