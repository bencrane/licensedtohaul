import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';

const WEBHOOK_SECRET = 'test-webhook-route-secret';

function buildPayload(event: string, externalId = 'ext-test-uuid'): string {
  return JSON.stringify({
    event,
    data: {
      id: 999,
      externalId,
      status: event === 'document.completed' ? 'COMPLETED' : 'PENDING',
    },
  });
}

function computeSig(body: string, secret: string): string {
  return createHmac('sha256', secret).update(Buffer.from(body, 'utf-8')).digest('hex');
}

describe('POST /api/webhooks/signature?provider=documenso', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    // No DB — route will throw on pool() calls but we're only testing HMAC path
    vi.stubEnv('LTH_DB_POOLED_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 for invalid HMAC signature', async () => {
    const { POST } = await import('@/app/api/webhooks/signature/route');

    const body = buildPayload('document.sent');
    const badSig = 'deadbeef'.repeat(8); // 64 chars but wrong

    const req = new Request(
      'http://localhost/api/webhooks/signature?provider=documenso',
      {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-documenso-signature': badSig,
        },
      },
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 503 when DOCUMENSO_WEBHOOK_SECRET is missing', async () => {
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', '');
    const { POST } = await import('@/app/api/webhooks/signature/route');

    const body = buildPayload('document.sent');
    const sig = computeSig(body, WEBHOOK_SECRET);

    const req = new Request(
      'http://localhost/api/webhooks/signature?provider=documenso',
      {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-documenso-signature': sig,
        },
      },
    );

    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('returns 200 for valid HMAC on non-completed event (no DB needed)', async () => {
    const { POST } = await import('@/app/api/webhooks/signature/route');

    const body = buildPayload('document.sent');
    const sig = computeSig(body, WEBHOOK_SECRET);

    const req = new Request(
      'http://localhost/api/webhooks/signature?provider=documenso',
      {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-documenso-signature': sig,
        },
      },
    );

    const res = await POST(req);
    // document.sent produces envelope.sent event — no DB ops needed
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);
  });
});
