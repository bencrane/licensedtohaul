// Test 14: Dropbox Sign webhook HMAC verify (skipped if DROPBOX_SIGN_API_KEY absent)
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import { createHmac } from 'node:crypto';
import type { Client } from 'pg';

const DROPBOX_SIGN_API_KEY = process.env.DROPBOX_SIGN_API_KEY;
const SKIP_TEST = !DROPBOX_SIGN_API_KEY;

let schemaName: string;
let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  if (SKIP_TEST) return;

  const harness = await createTestSchema();
  schemaName = harness.schemaName;
  client = harness.client;
  cleanup = harness.cleanup;
  vi.stubEnv('LTH_SCHEMA', schemaName);
  vi.stubEnv('HQX_DB_URL_POOLED', process.env.HQX_DB_URL_POOLED!);
  vi.stubEnv('SIGNATURE_PROVIDER', 'dropbox-sign');

  // Seed an NOA envelope so the webhook handler can process the transition
  await client.query(
    `INSERT INTO "${schemaName}".noa_envelopes
       (external_id, carrier_dot, factor_slug, provider, state, provider_envelope_id)
     VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '1234567', 'apex-capital', 'dropbox-sign', 'sent', 'test-dbs-env-id')`,
  );
});

afterAll(async () => {
  if (SKIP_TEST) return;
  await cleanup?.();
});

function buildDropboxSignPayload(eventTime: string, eventType: string, externalId?: string) {
  return {
    event: {
      event_time: eventTime,
      event_type: eventType,
      event_hash: '',
      event_metadata: {
        related_signature_id: 'test-sig-id',
        reported_for_account_id: 'test-account',
      },
    },
    signature_request: {
      signature_request_id: 'test-dbs-env-id',
      metadata: externalId ? { externalId } : {},
    },
  };
}

function computeDropboxHmac(eventTime: string, eventType: string, apiKey: string): string {
  return createHmac('sha256', apiKey).update(eventTime + eventType, 'utf8').digest('hex');
}

describe('POST /api/webhooks/signature?provider=dropbox-sign', () => {
  it.skipIf(SKIP_TEST)('valid Dropbox Sign HMAC → 200', async () => {
    const apiKey = DROPBOX_SIGN_API_KEY!;
    const eventTime = '1715000000';
    const eventType = 'signature_request_sent';

    const payload = buildDropboxSignPayload(eventTime, eventType);
    const sig = computeDropboxHmac(eventTime, eventType, apiKey);

    const { POST } = await import('@/app/api/webhooks/signature/route');
    const bodyStr = JSON.stringify(payload);

    const req = new Request('http://localhost/api/webhooks/signature?provider=dropbox-sign', {
      method: 'POST',
      body: bodyStr,
      headers: {
        'content-type': 'application/json',
        'x-hellosign-signature': sig,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it.skipIf(SKIP_TEST)('tampered Dropbox Sign HMAC → 401', async () => {
    const eventTime = '1715000000';
    const eventType = 'signature_request_sent';

    const payload = buildDropboxSignPayload(eventTime, eventType);
    const badSig = 'cafebabedeadbeef'.repeat(4);

    const { POST } = await import('@/app/api/webhooks/signature/route');
    const bodyStr = JSON.stringify(payload);

    const req = new Request('http://localhost/api/webhooks/signature?provider=dropbox-sign', {
      method: 'POST',
      body: bodyStr,
      headers: {
        'content-type': 'application/json',
        'x-hellosign-signature': badSig,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it.skipIf(!SKIP_TEST)('DROPBOX_SIGN_API_KEY absent — test skipped cleanly', () => {
    console.warn('Test 14 SKIPPED: DROPBOX_SIGN_API_KEY not in Doppler');
  });
});
