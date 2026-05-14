/**
 * Updated for Documenso v2 Platform: webhook verification uses plain X-Documenso-Secret
 * header equality (constant-time compare), NOT HMAC. File kept in dealroom-v1/ for
 * regression tracking; tests updated to match corrected implementation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const WEBHOOK_SECRET = 'test-webhook-secret-abc';

describe('DocumensoProvider.handleWebhook secret verification (v2 Platform)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns verified=true for correct X-Documenso-Secret header', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_SENT', payload: { id: '1', status: 'PENDING' } });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-secret': WEBHOOK_SECRET,
    });

    expect(result.verified).toBe(true);
  });

  it('returns verified=false for wrong secret value', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_SENT', payload: { id: '1', status: 'PENDING' } });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-secret': 'wrong-secret-value!!!!',
    });

    expect(result.verified).toBe(false);
  });

  it('returns verified=false when secret is missing from env', async () => {
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', '');
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_COMPLETED', payload: {} });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {
      'x-documenso-secret': WEBHOOK_SECRET,
    });

    expect(result.verified).toBe(false);
  });

  it('returns verified=false when header is missing', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    const payload = JSON.stringify({ event: 'DOCUMENT_SENT', payload: {} });
    const rawBody = Buffer.from(payload, 'utf-8');

    const result = provider.handleWebhook(rawBody, {});
    expect(result.verified).toBe(false);
  });
});
