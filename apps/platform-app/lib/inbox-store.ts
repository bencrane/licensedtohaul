// In-memory singleton for inbox messages pushed by carrier actions.
// Merged into the inbox at render time alongside the static mock messages.

import type { InboxMessage } from "@/lib/mock-dashboard";

const messages: InboxMessage[] = [];

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeToInbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getInboxSnapshot(): InboxMessage[] {
  return messages;
}

export function pushInboxMessage(
  carrierDot: string,
  factorName: string,
  quoteId: string,
  factorSlug: string,
): void {
  const id = `msg-submit-${quoteId}-${Date.now()}`;
  messages.unshift({
    id,
    category: "financing",
    subject: `Your quote with ${factorName} is in`,
    preview: `Your profile has been shared with ${factorName}. They'll be in touch within 1–2 business days to discuss next steps.`,
    body: [
      `You submitted your interest to ${factorName} on ${new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}.`,
      `Your USDOT profile, MC number, address, fleet size, authority history, insurance summary, and CSA BASIC scores were shared.`,
      `What happens next:\n• ${factorName} will review your submission and reach out within 1–2 business days\n• If approved, they will send you an NOA and onboarding documents to sign in your deal room\n• NOA signing, onboarding, and disbursements all happen on this platform — you'll track everything in your deal room`,
      `Track your submission status in your deal room.`,
    ].join("\n\n"),
    fromName: "Financing",
    fromEmail: "financing@licensedtohaul.com",
    sentAt: new Date().toISOString(),
    relativeTime: "Just now",
    read: false,
    important: false,
    primaryAction: {
      label: "Open deal room",
      href: `/dashboard/${carrierDot}/financing/${factorSlug}`,
    },
  });
  notify();
}
