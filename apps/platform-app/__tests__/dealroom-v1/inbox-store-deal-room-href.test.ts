import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('pushInboxMessage — deal room href (p6)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('sets primaryAction.href to /dashboard/{dot}/financing/{factorSlug}', async () => {
    const { pushInboxMessage, getInboxSnapshot } = await import('@/lib/inbox-store');

    // Add a message
    pushInboxMessage('1234567', 'Apex Capital', 'q-abc', 'apex-capital');

    const msgs = getInboxSnapshot();
    const msg = msgs.find((m) => m.id.includes('q-abc'));
    expect(msg).toBeTruthy();
    expect(msg!.primaryAction?.href).toBe('/dashboard/1234567/financing/apex-capital');
  });

  it('uses the deal room URL, not the financing list URL', async () => {
    const { pushInboxMessage, getInboxSnapshot } = await import('@/lib/inbox-store');

    pushInboxMessage('9876543', 'Triumph Pay', 'q-xyz', 'triumph-pay');

    const msgs = getInboxSnapshot();
    const msg = msgs.find((m) => m.id.includes('q-xyz'));
    expect(msg!.primaryAction?.href).not.toBe('/dashboard/9876543/financing');
    expect(msg!.primaryAction?.href).toBe('/dashboard/9876543/financing/triumph-pay');
  });
});
