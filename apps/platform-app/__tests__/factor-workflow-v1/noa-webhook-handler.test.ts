import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import type { Client } from 'pg';

vi.stubEnv('SIGNATURE_PROVIDER', 'fake');
vi.stubEnv('STRIPE_API_KEY', 'sk_test_fake');

let schemaName: string;
let client: Client;
let cleanup: () => Promise<void>;

// Envelope external_id used in this test
const ENV_EXTERNAL_ID = '00000000-0000-4000-a000-000000000002';

beforeAll(async () => {
  const harness = await createTestSchema();
  schemaName = harness.schemaName;
  client = harness.client;
  cleanup = harness.cleanup;
  vi.stubEnv('LTH_SCHEMA', schemaName);
  vi.stubEnv('HQX_DB_URL_POOLED', process.env.HQX_DB_URL_POOLED!);

  // Seed prior active FoR for carrier 1234567 (triumph-pay)
  await client.query(
    `INSERT INTO "${schemaName}".noa_envelopes
       (external_id, carrier_dot, factor_slug, provider, state)
     VALUES ('00000000-0000-4000-a000-000000000001', '1234567', 'triumph-pay', 'fake', 'completed')`,
  );
  const { rows: seedEnv } = await client.query(
    `SELECT id FROM "${schemaName}".noa_envelopes WHERE external_id = '00000000-0000-4000-a000-000000000001'`,
  );
  await client.query(
    `INSERT INTO "${schemaName}".factor_of_record
       (carrier_dot, factor_slug, factor_display_name, status, assigned_at, noa_envelope_id)
     VALUES ('1234567', 'triumph-pay', 'Triumph Pay', 'active', now() - interval '1 month', $1)`,
    [seedEnv[0].id],
  );

  // Seed noa_envelopes row for the envelope that will be completed
  // But we also need the FakeSignatureProvider to know about this envelope
  // so handleWebhook can find it by externalId.
  // We prime the FakeSignatureProvider via the route's singleton.
  // Strategy: POST a "create" envelope first via the provider singleton.
  const { resetSignatureProvider } = await import('@/lib/signature/index');
  resetSignatureProvider();
  vi.stubEnv('SIGNATURE_PROVIDER', 'fake');

  const { getSignatureProvider } = await import('@/lib/signature/index');
  const provider = getSignatureProvider();
  await provider.createEnvelope({
    externalId: ENV_EXTERNAL_ID,
    subject: 'NOA apex-capital',
    signers: [{ role: 'carrier', name: 'Carrier 1234567', email: 'carrier@test.local' }],
    mode: 'embedded',
  });

  // Insert the corresponding row in noa_envelopes with that external_id
  await client.query(
    `INSERT INTO "${schemaName}".noa_envelopes
       (external_id, carrier_dot, factor_slug, provider, state, provider_envelope_id)
     VALUES ($1, '1234567', 'apex-capital', 'fake', 'sent', $2)`,
    [ENV_EXTERNAL_ID, `fake-env-${ENV_EXTERNAL_ID}`],
  );
});

afterAll(async () => {
  await cleanup();
});

describe('POST /api/webhooks/signature', () => {
  it('processes envelope.completed and updates DB state', async () => {
    const signedAt = new Date('2026-05-13T14:00:00Z');

    // Import route handler after env is set
    const { POST } = await import('@/app/api/webhooks/signature/route');

    const payload = {
      kind: 'envelope.completed',
      externalId: ENV_EXTERNAL_ID,
      signerIp: '203.0.113.7',
      signedAt: signedAt.toISOString(),
    };

    const req = new Request('http://localhost/api/webhooks/signature', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // noa_envelopes row updated to completed
    const { rows: envRows } = await client.query(
      `SELECT state, signed_at, signer_ip
       FROM "${schemaName}".noa_envelopes
       WHERE external_id = $1`,
      [ENV_EXTERNAL_ID],
    );
    expect(envRows[0].state).toBe('completed');
    expect(envRows[0].signer_ip).toBe('203.0.113.7');

    // New active FoR for apex-capital
    const { rows: newForRows } = await client.query(
      `SELECT carrier_dot, factor_slug, status
       FROM "${schemaName}".factor_of_record
       WHERE carrier_dot = '1234567' AND factor_slug = 'apex-capital' AND status = 'active'`,
    );
    expect(newForRows).toHaveLength(1);
    expect(newForRows[0].carrier_dot).toBe('1234567');

    // Prior triumph-pay FoR is now revoked
    const { rows: revokedRows } = await client.query(
      `SELECT status
       FROM "${schemaName}".factor_of_record
       WHERE carrier_dot = '1234567' AND factor_slug = 'triumph-pay'`,
    );
    expect(revokedRows[0].status).toBe('revoked');

    // Audit log: for.assigned
    const { rows: auditRows } = await client.query(
      `SELECT event FROM "${schemaName}".factor_audit_log
       WHERE carrier_dot = '1234567' AND event = 'for.assigned'`,
    );
    expect(auditRows).toHaveLength(1);

    // Billing event queued
    const { rows: billingRows } = await client.query(
      `SELECT factor_slug, event_name, emitted, payload
       FROM "${schemaName}".factor_billing_events
       WHERE factor_slug = 'apex-capital' AND event_name = 'noa.transition'`,
    );
    expect(billingRows).toHaveLength(1);
    expect(billingRows[0].emitted).toBe(false);
    expect(billingRows[0].payload.envelope_id).toBe(ENV_EXTERNAL_ID);
  });
});
