// In-memory singleton store for carrier quote submissions.
// State resets on dev-server restart — acceptable for demo.

import type { FinancingQuoteStatus } from "@/lib/mock-opportunities";

export type QuoteSubmission = {
  quoteId: string;
  factorSlug: string;
  factorName: string;
  carrierDot: string;
  submittedAt: string; // ISO timestamp
  fieldsShared: string[];
  currentState: FinancingQuoteStatus;
};

// Module-scope mutable store — singleton across all client references during a session.
const submissions: QuoteSubmission[] = [];

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeToStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSnapshot(): QuoteSubmission[] {
  return submissions;
}

export const FIELDS_SHARED = [
  "USDOT",
  "MC number",
  "address",
  "fleet size",
  "authority history",
  "insurance summary",
  "BASIC scores",
];

export function submitQuote(params: {
  quoteId: string;
  factorSlug: string;
  factorName: string;
  carrierDot: string;
}): QuoteSubmission {
  const entry: QuoteSubmission = {
    ...params,
    submittedAt: new Date().toISOString(),
    fieldsShared: FIELDS_SHARED,
    currentState: "submitted",
  };
  submissions.push(entry);
  notify();
  return entry;
}

export function getSubmissionForQuote(quoteId: string): QuoteSubmission | undefined {
  return submissions.find((s) => s.quoteId === quoteId);
}

export function getActiveSubmissions(): QuoteSubmission[] {
  return submissions.filter((s) =>
    (["submitted", "contacted", "underwriting"] as FinancingQuoteStatus[]).includes(s.currentState),
  );
}
