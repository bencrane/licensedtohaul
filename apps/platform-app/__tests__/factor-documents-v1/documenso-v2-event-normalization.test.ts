/**
 * Documenso v2 Platform event normalization.
 * Documenso v2 event names are DOCUMENT_* (uppercase).
 * Legacy v1 lowercase names (document.*) also supported for backward compat.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const WEBHOOK_SECRET = 'normalization-test-secret';

function makeV2Body(event: string, extraPayload?: Record<string, unknown>): Buffer {
  return Buffer.from(
    JSON.stringify({
      event,
      payload: { id: 'envelope_100', externalId: 'ext-abc', status: 'PENDING', ...extraPayload },
    }),
    'utf-8',
  );
}

describe('DocumensoProvider — v2 event normalization', () => {
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
    it(`maps ${docEvent} → ${normalizedKind}`, async () => {
      const { DocumensoProvider } = await import('@/lib/signature/documenso');
      const provider = new DocumensoProvider();

      const body = makeV2Body(docEvent);
      const result = provider.handleWebhook(body, { 'x-documenso-secret': WEBHOOK_SECRET });

      expect(result.verified).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].kind).toBe(normalizedKind);
    });
  }

  it('DOCUMENT_SENT → envelope includes providerEnvelopeId', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const body = makeV2Body('DOCUMENT_SENT');
    const result = provider.handleWebhook(body, { 'x-documenso-secret': WEBHOOK_SECRET });

    expect(result.verified).toBe(true);
    expect(result.events[0].envelope.providerEnvelopeId).toBe('envelope_100');
    expect(result.events[0].envelope.externalId).toBe('ext-abc');
  });

  it('DOCUMENT_COMPLETED → envelope status is completed', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const body = makeV2Body('DOCUMENT_COMPLETED', { status: 'COMPLETED' });
    const result = provider.handleWebhook(body, { 'x-documenso-secret': WEBHOOK_SECRET });

    expect(result.events[0].envelope.status).toBe('completed');
  });

  it('returns verified=true with empty events for unknown future event', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const body = makeV2Body('DOCUMENT_UNKNOWN_FUTURE_EVENT');
    const result = provider.handleWebhook(body, { 'x-documenso-secret': WEBHOOK_SECRET });

    expect(result.verified).toBe(true);
    expect(result.events).toHaveLength(0);
  });
});
