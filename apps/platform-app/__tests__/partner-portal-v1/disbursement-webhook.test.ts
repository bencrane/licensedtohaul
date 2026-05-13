// Test 9: disbursement webhook HMAC verify + DB effects
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import { createHmac } from 'node:crypto';
import type { Client } from 'pg';

const SKIP_TEST = !process.env.DISBURSEMENT_WEBHOOK_SECRET;

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
});

afterAll(async () => {
  if (SKIP_TEST) return;
  await cleanup?.();
});

describe('POST /api/webhooks/disbursement', () => {
  it.skipIf(SKIP_TEST)('valid HMAC → 200 + DB row written', async () => {
    const secret = process.env.DISBURSEMENT_WEBHOOK_SECRET!;

    const bodyObj = {
      factorSlug: 'apex-capital',
      carrierDot: '1234567',
      amount: 2500,
      disbursedAt: '2026-05-13',
      referenceId: 'WEBHOOK-001',
    };
    const bodyStr = JSON.stringify(bodyObj);
    const sig = createHmac('sha256', secret).update(bodyStr, 'utf8').digest('hex');

    const { POST } = await import('@/app/api/webhooks/disbursement/route');
    const req = new Request('http://localhost/api/webhooks/disbursement', {
      method: 'POST',
      body: bodyStr,
      headers: {
        'content-type': 'application/json',
        'x-disbursement-signature': sig,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify DB row
    const { rows } = await client.query(
      `SELECT factor_slug, carrier_dot, amount_cents::text, status, source
       FROM "${schemaName}".disbursements
       WHERE factor_slug = 'apex-capital' AND reference_id = 'WEBHOOK-001'`,
    );
    expect(rows).toHaveLength(1);
    expect(parseInt(rows[0].amount_cents, 10)).toBe(250000);
    expect(rows[0].status).toBe('observed');
    expect(rows[0].source).toBe('webhook');
  });

  it.skipIf(SKIP_TEST)('tampered HMAC → 401 + no DB rows', async () => {
    const bodyObj = {
      factorSlug: 'apex-capital',
      carrierDot: '1234567',
      amount: 999,
      disbursedAt: '2026-05-13',
      referenceId: 'TAMPERED-001',
    };
    const bodyStr = JSON.stringify(bodyObj);
    const badSig = 'deadbeef'.repeat(8);

    const { POST } = await import('@/app/api/webhooks/disbursement/route');
    const req = new Request('http://localhost/api/webhooks/disbursement', {
      method: 'POST',
      body: bodyStr,
      headers: {
        'content-type': 'application/json',
        'x-disbursement-signature': badSig,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    // No rows with tampered reference
    const { rows } = await client.query(
      `SELECT id FROM "${schemaName}".disbursements WHERE reference_id = 'TAMPERED-001'`,
    );
    expect(rows).toHaveLength(0);
  });

  it.skipIf(!SKIP_TEST)('DISBURSEMENT_WEBHOOK_SECRET is absent — test skipped', () => {
    console.warn('Test 9 SKIPPED: DISBURSEMENT_WEBHOOK_SECRET not in Doppler');
  });
});
