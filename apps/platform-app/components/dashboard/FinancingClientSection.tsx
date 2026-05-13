"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Check,
  Clock,
  Send,
  Phone,
  Search,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Zap,
  FileText,
  Banknote,
  ArrowRight,
  X,
} from "lucide-react";
import ConsentModal from "@/components/dashboard/ConsentModal";
import type { FinancingQuote, FinancingQuoteStatus } from "@/lib/mock-opportunities";
import {
  subscribeToStore,
  getSnapshot,
  submitQuote,
  getSubmissionForQuote,
  getActiveSubmissions,
} from "@/lib/quote-state-store";
import { pushInboxMessage } from "@/lib/inbox-store";

const TYPE_STYLES = {
  factoring: { label: "Invoice factoring", chip: "border-violet-200 bg-violet-50 text-violet-800", icon: <FileText className="h-3 w-3" /> },
  "fuel-advance": { label: "Fuel advance", chip: "border-orange-200 bg-orange-50 text-orange-800", icon: <Zap className="h-3 w-3" /> },
  "working-capital": { label: "Working capital", chip: "border-sky-200 bg-sky-50 text-sky-800", icon: <Banknote className="h-3 w-3" /> },
} as const;

type StatusConfig = {
  chip: string;
  icon: React.ReactNode;
  label: string;
  footerCopy: string;
  primaryAction?: { label: string; icon: React.ReactNode };
  secondaryAction?: { label: string; icon: React.ReactNode };
};

const STATUS_CONFIG: Record<FinancingQuoteStatus, StatusConfig> = {
  available: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <Check className="h-3 w-3" />,
    label: "Available",
    footerCopy: "Review the terms above and click below to submit your interest.",
  },
  pending: {
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    icon: <Clock className="h-3 w-3" />,
    label: "Pending",
    footerCopy: "This factor is still underwriting your profile. No action needed yet.",
  },
  received: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <Check className="h-3 w-3" />,
    label: "Received",
    footerCopy: "Quote received. Review terms and submit when ready.",
  },
  submitted: {
    chip: "border-sky-200 bg-sky-50 text-sky-800",
    icon: <Send className="h-3 w-3" />,
    label: "Submitted",
    footerCopy: "Your info has been shared. The factor will reach out within 1–2 business days.",
    secondaryAction: { label: "Withdraw", icon: <X className="h-3 w-3" /> },
  },
  contacted: {
    chip: "border-sky-200 bg-sky-50 text-sky-800",
    icon: <Phone className="h-3 w-3" />,
    label: "Contacted",
    footerCopy: "The factor has reached out. Check your email or phone for next steps.",
    secondaryAction: { label: "Withdraw", icon: <X className="h-3 w-3" /> },
  },
  underwriting: {
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    icon: <Search className="h-3 w-3" />,
    label: "Underwriting",
    footerCopy: "Underwriting in progress. You'll hear back within 3–5 business days.",
  },
  approved: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <ThumbsUp className="h-3 w-3" />,
    label: "Approved",
    footerCopy: "Approved! The factor will send you an agreement to complete onboarding off-platform.",
    primaryAction: { label: "View next steps", icon: <ArrowRight className="h-3 w-3" /> },
  },
  declined: {
    chip: "border-stone-300 bg-stone-100 text-stone-600",
    icon: <ThumbsDown className="h-3 w-3" />,
    label: "Declined",
    footerCopy: "This factor passed on your profile. Other quotes are still available.",
  },
  onboarding: {
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    icon: <Layers className="h-3 w-3" />,
    label: "Onboarding",
    footerCopy: "Onboarding is in progress off-platform. Sign documents and provide banking details directly with the factor.",
    primaryAction: { label: "View next steps", icon: <ArrowRight className="h-3 w-3" /> },
  },
  active: {
    chip: "border-emerald-300 bg-emerald-50 text-emerald-900",
    icon: <Check className="h-3 w-3" />,
    label: "Active",
    footerCopy: "This factor is your active funding partner.",
  },
};

type ModalState = {
  open: boolean;
  quote: FinancingQuote | null;
};

export default function FinancingClientSection({
  quotes,
  dot,
}: {
  quotes: FinancingQuote[];
  dot: string;
}) {
  const [modal, setModal] = useState<ModalState>({ open: false, quote: null });
  // Subscribe to store so component re-renders when a quote is submitted
  useSyncExternalStore(subscribeToStore, getSnapshot);

  const factoringQuotes = quotes.filter((q) => q.type === "factoring");
  const otherQuotes = quotes.filter((q) => q.type !== "factoring");

  const activeSubmissions = getActiveSubmissions();
  const existingPartner =
    modal.quote && activeSubmissions.find((s) => s.quoteId !== modal.quote!.id)?.factorName;

  function handleConfirm(quote: FinancingQuote) {
    submitQuote({
      quoteId: quote.id,
      factorSlug: quote.factorSlug,
      factorName: quote.factorName,
      carrierDot: dot,
    });
    pushInboxMessage(dot, quote.factorName, quote.id);
  }

  return (
    <>
      {/* Factoring quotes */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl text-stone-900">
            Invoice factoring quotes
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            {factoringQuotes.length} {factoringQuotes.length === 1 ? "quote" : "quotes"}
          </span>
        </div>
        <ul className="grid gap-px border border-line bg-line md:grid-cols-2">
          {factoringQuotes.map((q) => (
            <FinancingCard
              key={q.id}
              quote={q}
              onTakeQuote={() => setModal({ open: true, quote: q })}
            />
          ))}
        </ul>
      </div>

      {/* Other financing */}
      {otherQuotes.length > 0 && (
        <div>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-2xl text-stone-900">
              Other financing
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
              Fuel advances · working capital
            </span>
          </div>
          <ul className="grid gap-px border border-line bg-line md:grid-cols-2">
            {otherQuotes.map((q) => (
              <FinancingCard
                key={q.id}
                quote={q}
                onTakeQuote={() => setModal({ open: true, quote: q })}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Consent modal */}
      {modal.quote && (
        <ConsentModal
          open={modal.open}
          onClose={() => setModal({ open: false, quote: null })}
          onConfirm={() => handleConfirm(modal.quote!)}
          partnerName={modal.quote.factorName}
          quoteId={modal.quote.id}
          existingSubmissionPartner={existingPartner || undefined}
        />
      )}
    </>
  );
}

function FinancingCard({
  quote,
  onTakeQuote,
}: {
  quote: FinancingQuote;
  onTakeQuote: () => void;
}) {
  // Merge store state with seed state
  const storeEntries = useSyncExternalStore(subscribeToStore, getSnapshot);
  const submission = storeEntries.find((s) => s.quoteId === quote.id);
  const effectiveStatus: FinancingQuoteStatus = submission
    ? submission.currentState
    : quote.status;

  const t = TYPE_STYLES[quote.type];
  const s = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG["pending"];

  const canTakeQuote =
    effectiveStatus === "available" || effectiveStatus === "received";

  return (
    <li className={`bg-surface p-5 ${effectiveStatus === "pending" ? "opacity-80" : ""}`}>
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${t.chip}`}
        >
          {t.icon}
          {t.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${s.chip}`}
        >
          {s.icon}
          {s.label}
        </span>
      </div>

      <h3 className="font-display mt-4 text-xl text-stone-900">
        {quote.factorName}
      </h3>

      <dl className="mt-4 space-y-2 text-xs">
        <Row label="Rate" value={quote.rate} />
        <Row label="Recourse" value={quote.recourseLabel} />
        <Row label="Funding speed" value={quote.fundingSpeed} />
        {quote.monthlyMinimum && <Row label="Minimum" value={quote.monthlyMinimum} />}
      </dl>

      {quote.notes && (
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-stone-600">
          {quote.notes}
        </p>
      )}

      {/* Footer with state copy + actions */}
      <div className="mt-5 border-t border-line pt-4 space-y-3">
        <p className="text-xs text-stone-600 leading-relaxed">{s.footerCopy}</p>

        <div className="flex flex-col gap-2">
          {canTakeQuote && (
            <button
              type="button"
              onClick={onTakeQuote}
              className="inline-flex w-full items-center justify-center gap-1.5 bg-orange-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700"
            >
              Take this quote
            </button>
          )}
          {s.primaryAction && (
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-1.5 border border-line bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-stone-800 transition-colors hover:border-orange-400 hover:text-orange-700"
            >
              {s.primaryAction.icon}
              {s.primaryAction.label}
            </button>
          )}
          {s.secondaryAction && (
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-1.5 border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 transition-colors hover:border-stone-400 hover:text-stone-700"
            >
              {s.secondaryAction.icon}
              {s.secondaryAction.label}
            </button>
          )}
        </div>
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
