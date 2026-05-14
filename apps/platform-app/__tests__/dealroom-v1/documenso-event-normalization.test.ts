/**
 * Updated for Documenso v2 Platform: event names are DOCUMENT_* (uppercase),
 * and verification uses plain X-Documenso-Secret header equality.
 * Also supports legacy lowercase document.* forms for backward compat.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const WEBHOOK_SECRET = 'test-normalization-secret';

function makeV2Body(event: string, extraPayload?: Record<string, unknown>): Buffer {
  return Buffer.from(
    JSON.stringify({
      event,
      payload: { id: '100', externalId: 'ext-abc', status: 'PENDING', ...extraPayload },
    }),
    'utf-8',
  );
}

describe('DocumensoProvider event normalization (v2 Platform)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const v2Cases: [string, string][] = [
    ['DOCUMENT_SENT', 'envelope.sent'],
    ['DOCUMENT_OPENED', 'envelope.viewed'],
    ['DOCUMENT_SIGNED', 'envelope.signed'],
    ['DOCUMENT_COMPLETED', 'envelope.completed'],
    ['DOCUMENT_REJECTED', 'envelope.declined'],
    ['DOCUMENT_CANCELLED', 'envelope.expired'],
  ];

  for (const [docEvent, normalizedKind] of v2Cases) {
    it(`maps v2 ${docEvent} → ${normalizedKind}`, async () => {
      const { DocumensoProvider } = await import('@/lib/signature/documenso');
      const provider = new DocumensoProvider();

      const body = makeV2Body(docEvent);

      const result = provider.handleWebhook(body, { 'x-documenso-secret': WEBHOOK_SECRET });

      expect(result.verified).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].kind).toBe(normalizedKind);
    });
  }

  // Legacy v1 lowercase event names also work (backward compat)
  const v1Cases: [string, string][] = [
    ['document.sent', 'envelope.sent'],
    ['document.opened', 'envelope.viewed'],
    ['document.signed', 'envelope.signed'],
    ['document.completed', 'envelope.completed'],
    ['document.rejected', 'envelope.declined'],
    ['document.expired', 'envelope.expired'],
  ];

  for (const [docEvent, normalizedKind] of v1Cases) {
    it(`maps legacy ${docEvent} → ${normalizedKind}`, async () => {
      const { DocumensoProvider } = await import('@/lib/signature/documenso');
      const provider = new DocumensoProvider();

      const body = Buffer.from(
        JSON.stringify({ event: docEvent, data: { id: '100', externalId: 'ext-abc', status: 'PENDING' } }),
        'utf-8',
      );

      const result = provider.handleWebhook(body, { 'x-documenso-secret': WEBHOOK_SECRET });

      expect(result.verified).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].kind).toBe(normalizedKind);
    });
  }

  it('returns verified=true with empty events for unknown event type', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const body = makeV2Body('DOCUMENT_UNKNOWN_FUTURE');

    const result = provider.handleWebhook(body, { 'x-documenso-secret': WEBHOOK_SECRET });

    expect(result.verified).toBe(true);
    expect(result.events).toHaveLength(0);
  });
});
