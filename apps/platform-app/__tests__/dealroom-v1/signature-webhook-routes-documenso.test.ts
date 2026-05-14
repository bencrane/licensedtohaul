/**
 * Updated for Documenso v2 Platform: webhook auth uses X-Documenso-Secret (plain secret),
 * NOT HMAC. Route returns 401 when secret mismatch, 503 when env var missing.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const WEBHOOK_SECRET = 'test-webhook-route-secret';

function buildV2Payload(event: string, externalId = 'ext-test-uuid'): string {
  return JSON.stringify({
    event,
    payload: {
      id: '999',
      externalId,
      status: event === 'DOCUMENT_COMPLETED' ? 'COMPLETED' : 'PENDING',
    },
  });
}

describe('POST /api/webhooks/signature?provider=documenso (v2 Platform)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    // No DB — route will throw on pool() calls but we're only testing secret path
    vi.stubEnv('LTH_DB_POOLED_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 for invalid X-Documenso-Secret header', async () => {
    const { POST } = await import('@/app/api/webhooks/signature/route');

    const body = buildV2Payload('DOCUMENT_SENT');
    const req = new Request(
      'http://localhost/api/webhooks/signature?provider=documenso',
      {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-documenso-secret': 'wrong-secret-value!',
        },
      },
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 503 when DOCUMENSO_WEBHOOK_SECRET is missing', async () => {
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', '');
    const { POST } = await import('@/app/api/webhooks/signature/route');

    const body = buildV2Payload('DOCUMENT_SENT');
    const req = new Request(
      'http://localhost/api/webhooks/signature?provider=documenso',
      {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-documenso-secret': WEBHOOK_SECRET,
        },
      },
    );

    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('returns 200 for valid X-Documenso-Secret on non-completed event (no DB needed)', async () => {
    const { POST } = await import('@/app/api/webhooks/signature/route');

    const body = buildV2Payload('DOCUMENT_SENT');
    const req = new Request(
      'http://localhost/api/webhooks/signature?provider=documenso',
      {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-documenso-secret': WEBHOOK_SECRET,
        },
      },
    );

    const res = await POST(req);
    // DOCUMENT_SENT produces envelope.sent event — no DB ops needed
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);
  });
});
