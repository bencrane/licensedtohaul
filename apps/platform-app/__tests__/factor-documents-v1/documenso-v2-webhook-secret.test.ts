/**
 * Documenso v2 Platform webhook verification via X-Documenso-Secret header.
 * Uses timingSafeEqual constant-time compare against DOCUMENSO_WEBHOOK_SECRET env var.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const WEBHOOK_SECRET = 'my-platform-webhook-secret-2026';

describe('DocumensoProvider.handleWebhook — X-Documenso-Secret verification', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns verified=true when X-Documenso-Secret matches env var', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({
      event: 'DOCUMENT_COMPLETED',
      payload: { id: 'envelope_1', externalId: 'ext-1', status: 'COMPLETED' },
    });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-secret': WEBHOOK_SECRET,
    });

    expect(result.verified).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].kind).toBe('envelope.completed');
  });

  it('returns verified=false when X-Documenso-Secret is wrong', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_SENT', payload: {} });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-secret': 'totally-wrong-secret',
    });

    expect(result.verified).toBe(false);
    expect(result.events).toHaveLength(0);
  });

  it('returns verified=false when DOCUMENSO_WEBHOOK_SECRET is unset', async () => {
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', '');
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_SENT', payload: {} });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-secret': WEBHOOK_SECRET,
    });

    expect(result.verified).toBe(false);
  });

  it('returns verified=false when X-Documenso-Secret header is missing', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_SENT', payload: {} });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {});
    expect(result.verified).toBe(false);
  });

  it('accepts X-Documenso-Secret in mixed case', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_SENT', payload: {} });
    const rawBody = Buffer.from(payload, 'utf-8');

    // Uppercase header key
    const result = provider.handleWebhook(rawBody, {
      'X-Documenso-Secret': WEBHOOK_SECRET,
    });

    expect(result.verified).toBe(true);
  });

  it('uses timingSafeEqual (same-length buffers compare correctly)', async () => {
    // This test verifies that length-different secrets fail without crashing
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_SENT', payload: {} });
    const rawBody = Buffer.from(payload, 'utf-8');

    // Different length — should fail (length mismatch → verified=false, no throw)
    const result = provider.handleWebhook(rawBody, {
      'x-documenso-secret': WEBHOOK_SECRET + 'EXTRA',
    });

    expect(result.verified).toBe(false);
  });
});
