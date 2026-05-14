import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';

const WEBHOOK_SECRET = 'test-normalization-secret';

function makeBody(event: string, extraData?: Record<string, unknown>): Buffer {
  return Buffer.from(
    JSON.stringify({
      event,
      data: { id: 100, externalId: 'ext-abc', status: 'PENDING', ...extraData },
    }),
    'utf-8',
  );
}

function computeSig(body: Buffer): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

describe('DocumensoProvider event normalization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const cases: [string, string][] = [
    ['document.sent', 'envelope.sent'],
    ['document.opened', 'envelope.viewed'],
    ['document.signed', 'envelope.signed'],
    ['document.completed', 'envelope.completed'],
    ['document.rejected', 'envelope.declined'],
    ['document.expired', 'envelope.expired'],
  ];

  for (const [docEvent, normalizedKind] of cases) {
    it(`maps ${docEvent} → ${normalizedKind}`, async () => {
      const { DocumensoProvider } = await import('@/lib/signature/documenso');
      const provider = new DocumensoProvider();

      const body = makeBody(docEvent);
      const sig = computeSig(body);

      const result = provider.handleWebhook(body, { 'x-documenso-signature': sig });

      expect(result.verified).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].kind).toBe(normalizedKind);
    });
  }

  it('returns verified=true with empty events for unknown event type', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const body = makeBody('document.unknown_future_event');
    const sig = computeSig(body);

    const result = provider.handleWebhook(body, { 'x-documenso-signature': sig });

    expect(result.verified).toBe(true);
    expect(result.events).toHaveLength(0);
  });
});
