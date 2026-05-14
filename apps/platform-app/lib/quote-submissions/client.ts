// Browser-safe in-memory store shim for DataPartnerLog.
// Mirrors the subscribe/snapshot API from the deleted lib/quote-state-store.ts.
// Server-rendered pages hydrate the component by passing submissions as a prop.

export interface ClientQuoteSubmission {
  quoteId: string;
  factorSlug: string;
  factorName: string;
  carrierDot: string;
  submittedAt: string; // ISO timestamp
  fieldsShared: string[];
  stage: string;
}

let _submissions: ClientQuoteSubmission[] = [];
const _listeners = new Set<() => void>();

function notify() {
  for (const fn of _listeners) fn();
}

export function subscribeToStore(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function getSnapshot(): ClientQuoteSubmission[] {
  return _submissions;
}

export function hydrateStore(submissions: ClientQuoteSubmission[]): void {
  _submissions = submissions;
  notify();
}

export function addToStore(submission: ClientQuoteSubmission): void {
  // Replace existing or prepend new
  const idx = _submissions.findIndex(
    (s) => s.carrierDot === submission.carrierDot && s.factorSlug === submission.factorSlug,
  );
  if (idx >= 0) {
    _submissions = [
      ...(_submissions.slice(0, idx)),
      submission,
      ...(_submissions.slice(idx + 1)),
    ];
  } else {
    _submissions = [submission, ..._submissions];
  }
  notify();
}
