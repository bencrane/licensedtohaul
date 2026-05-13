"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Send,
  Zap,
  FileText,
} from "lucide-react";
import ConsentModal from "@/components/dashboard/ConsentModal";
import type { FactorProfile } from "@/lib/factor-profiles/types";
import { submitQuote } from "@/lib/quote-submit/actions";

type FactorMatch = FactorProfile & { match_reasons?: string[] };

type ModalState = {
  open: boolean;
  profile: FactorMatch | null;
};

export default function FinancingClientSection({
  profiles,
  dot,
}: {
  profiles: FactorMatch[];
  dot: string;
}) {
  const [modal, setModal] = useState<ModalState>({ open: false, profile: null });
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function handleConfirm(profile: FactorProfile) {
    startTransition(async () => {
      // We need both org IDs. carrier org id comes from the dot (USDOT).
      // submitQuote accepts factorOrgId + carrierOrgId. We pass org_id from the profile
      // and look up carrier org id server-side inside submitQuote.
      const result = await submitQuote(profile.org_id, dot);
      if (result.ok) {
        setSubmitted((prev) => new Set(prev).add(profile.org_id));
      }
    });
  }

  if (profiles.length === 0) return null;

  return (
    <>
      <div>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl text-stone-900">
            Invoice factoring
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            {profiles.length} {profiles.length === 1 ? "factor" : "factors"}
          </span>
        </div>
        <ul className="grid gap-px border border-line bg-line md:grid-cols-2">
          {profiles.map((p) => (
            <FactorCard
              key={p.id}
              profile={p}
              isSubmitted={submitted.has(p.org_id)}
              onTakeQuote={() => setModal({ open: true, profile: p })}
            />
          ))}
        </ul>
      </div>

      {modal.profile && (
        <ConsentModal
          open={modal.open}
          onClose={() => setModal({ open: false, profile: null })}
          onConfirm={() => handleConfirm(modal.profile!)}
          partnerName={modal.profile.org_name}
          profileId={modal.profile.id}
        />
      )}
    </>
  );
}

function FactorCard({
  profile,
  isSubmitted,
  onTakeQuote,
}: {
  profile: FactorMatch;
  isSubmitted: boolean;
  onTakeQuote: () => void;
}) {
  const t = profile.terms;
  const reasons = profile.match_reasons ?? [];

  return (
    <li className="bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-800">
          <FileText className="h-3 w-3" />
          Invoice factoring
        </span>
        {isSubmitted && (
          <span className="inline-flex items-center gap-1 border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-800">
            <Send className="h-3 w-3" />
            Submitted
          </span>
        )}
      </div>

      <h3 className="font-display mt-4 text-xl text-stone-900">
        {profile.org_name}
      </h3>

      {profile.display_copy && (
        <p className="mt-2 text-xs leading-relaxed text-stone-600">
          {profile.display_copy}
        </p>
      )}

      {reasons.length > 0 && (
        <div className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
            Why this factor matches you
          </p>
          <ul className="mt-1.5 space-y-1">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-1.5 text-xs text-emerald-900">
                <Check className="mt-0.5 h-3 w-3 flex-none text-emerald-600" strokeWidth={3} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="mt-4 space-y-2 text-xs">
        <Row
          label="Advance rate"
          value={`${t.advance_rate_pct}%`}
        />
        <Row
          label="Factoring rate"
          value={`${t.factoring_rate_pct}%`}
        />
        <Row
          label="Recourse"
          value={t.recourse === "non-recourse" ? "Non-recourse" : "Recourse"}
        />
        <Row label="Funding speed" value={t.funding_speed} />
        {t.monthly_minimum_usd != null && t.monthly_minimum_usd > 0 && (
          <Row
            label="Monthly minimum"
            value={`$${t.monthly_minimum_usd.toLocaleString()}`}
          />
        )}
      </dl>

      {t.fuel_card_addon && t.fuel_card_description && (
        <p className="mt-4 flex items-start gap-1.5 border-t border-line pt-3 text-xs leading-relaxed text-stone-600">
          <Zap className="mt-0.5 h-3 w-3 flex-none text-orange-500" />
          {t.fuel_card_description}
        </p>
      )}

      <div className="mt-5 border-t border-line pt-4">
        {isSubmitted ? (
          <p className="flex items-center gap-1.5 text-xs text-stone-600">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            Quote submitted. They will review your profile and reach out within 1–2 business days.
          </p>
        ) : (
          <button
            type="button"
            onClick={onTakeQuote}
            className="inline-flex w-full items-center justify-center gap-1.5 bg-orange-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700"
          >
            Take this quote
          </button>
        )}
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-b-0">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-mono text-stone-900">{value}</dd>
    </div>
  );
}
