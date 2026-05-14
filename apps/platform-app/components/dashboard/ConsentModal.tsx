"use client";

import { useEffect, useRef } from "react";
import { X, ShieldCheck, AlertTriangle } from "lucide-react";

// Fields shared with the factor partner on quote submission.
// Must match FIELDS_SHARED in lib/quote-submissions/constants.ts exactly.
const MODAL_FIELDS = [
  "USDOT",
  "MC number",
  "address",
  "fleet size",
  "authority history",
  "insurance summary",
  "BASIC scores",
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  partnerName: string;
  quoteId: string;
  existingSubmissionPartner?: string; // set when C9 multi-quote warning applies
};

export default function ConsentModal({
  open,
  onClose,
  onConfirm,
  partnerName,
  quoteId: _quoteId,
  existingSubmissionPartner,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        ref={dialogRef}
        className="w-full max-w-[600px] border border-line bg-surface"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-orange-600" />
            <h2
              id="consent-modal-title"
              className="font-display text-2xl text-stone-900"
            >
              Share your data with {partnerName}?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center border border-line bg-white text-stone-500 transition-colors hover:border-orange-300 hover:text-orange-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Multi-quote warning (C9 stretch) */}
          {existingSubmissionPartner && (
            <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-4 w-4 flex-none text-amber-700 mt-0.5" />
              <p className="text-sm text-amber-800">
                You already submitted to{" "}
                <span className="font-semibold">{existingSubmissionPartner}</span>.
                Most carriers only need one factoring partner at a time. You can
                still proceed, but having two active submissions may create
                conflicting onboarding requests.
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-stone-700 leading-relaxed">
              Clicking <span className="font-semibold">Confirm</span> shares the
              following data fields from your USDOT profile with{" "}
              <span className="font-semibold">{partnerName}</span>. They will use
              it to finalize your quote and start onboarding in your deal room
              on this platform.
            </p>
          </div>

          <div className="border border-line bg-stone-50">
            <p className="px-4 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Data fields being shared
            </p>
            <ul className="divide-y divide-line">
              {MODAL_FIELDS.map((field) => (
                <li
                  key={field}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-800"
                >
                  <ShieldCheck className="h-3.5 w-3.5 flex-none text-emerald-600" />
                  {field}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Licensed to Haul hosts the NOA signing, onboarding, and
            disbursement flow with {partnerName} in your deal room on this
            platform. You&apos;ll see status updates, sign documents, and
            track payments here.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 border border-line bg-white transition-colors hover:border-stone-400 hover:text-stone-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 transition-colors hover:bg-orange-700"
          >
            {existingSubmissionPartner ? "Confirm anyway" : "Confirm — share and submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
