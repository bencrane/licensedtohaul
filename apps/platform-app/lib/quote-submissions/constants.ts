// FIELDS_SHARED — canonical list of data fields shared with factor partners on quote submission.
// Was previously in lib/quote-state-store.ts; moved here as the new source of truth.
// ConsentModal.tsx MODAL_FIELDS must match this list exactly.

export const FIELDS_SHARED = [
  'USDOT',
  'MC number',
  'address',
  'fleet size',
  'authority history',
  'insurance summary',
  'BASIC scores',
] as const;

export type FieldsSharedItem = (typeof FIELDS_SHARED)[number];
