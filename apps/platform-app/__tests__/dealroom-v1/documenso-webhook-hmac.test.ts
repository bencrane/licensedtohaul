import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';

const WEBHOOK_SECRET = 'test-webhook-secret-abc';

function computeDocumensoHmac(rawBody: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('DocumensoProvider.handleWebhook HMAC verification', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns verified=true for correct HMAC', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'document.sent', data: { id: 1, status: 'SENT' } });
    const rawBody = Buffer.from(payload, 'utf-8');
    const sig = computeDocumensoHmac(rawBody, WEBHOOK_SECRET);

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-signature': sig,
    });

    expect(result.verified).toBe(true);
  });

  it('returns verified=false for tampered signature (1 byte flipped)', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'document.sent', data: { id: 1, status: 'SENT' } });
    const rawBody = Buffer.from(payload, 'utf-8');
    const sig = computeDocumensoHmac(rawBody, WEBHOOK_SECRET);

    // Flip one character
    const tampered = sig.slice(0, -2) + (sig.endsWith('ff') ? '00' : 'ff');

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-signature': tampered,
    });

    expect(result.verified).toBe(false);
  });

  it('returns verified=false when secret is missing', async () => {
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', '');
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'document.completed' });
    const rawBody = Buffer.from(payload, 'utf-8');
    const sig = computeDocumensoHmac(rawBody, WEBHOOK_SECRET);

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-signature': sig,
    });

    expect(result.verified).toBe(false);
  });

  it('returns verified=false when signature header is missing', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'document.sent' });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {});
    expect(result.verified).toBe(false);
  });
});
