// Test 13: real Dropbox Sign envelope creation (skipped if DROPBOX_SIGN_API_KEY absent)
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import type { Client } from 'pg';

const DROPBOX_SIGN_API_KEY = process.env.DROPBOX_SIGN_API_KEY;
const SKIP_TEST = !DROPBOX_SIGN_API_KEY;

let schemaName: string;
let client: Client;
let cleanup: () => Promise<void>;
let createdEnvelopeId: string | null = null;

beforeAll(async () => {
  if (SKIP_TEST) return;

  const harness = await createTestSchema();
  schemaName = harness.schemaName;
  client = harness.client;
  cleanup = harness.cleanup;
  vi.stubEnv('LTH_SCHEMA', schemaName);
  vi.stubEnv('LTH_DB_POOLED_URL', process.env.LTH_DB_POOLED_URL!);
  vi.stubEnv('SIGNATURE_PROVIDER', 'dropbox-sign');
});

afterAll(async () => {
  if (SKIP_TEST) return;

  // Cancel the test envelope to clean up
  if (createdEnvelopeId) {
    try {
      const DropboxSign = await import('@dropbox/sign');
      const api = new DropboxSign.SignatureRequestApi();
      api.username = DROPBOX_SIGN_API_KEY!;
      await api.signatureRequestCancel(createdEnvelopeId).catch(() => {});
    } catch {}
  }

  await cleanup?.();
});

describe('initiateNoaSignature (real Dropbox Sign)', () => {
  it.skipIf(SKIP_TEST)('creates real Dropbox Sign envelope and persists to DB', async () => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.LTH_DB_POOLED_URL!, max: 1 });

    try {
      const { resetSignatureProvider } = await import('@/lib/signature/index');
      resetSignatureProvider();

      const { initiateNoaSignature } = await import('@/lib/factor-of-record/actions');

      // Synthetic carrier email (no org table dependency)
      const result = await initiateNoaSignature(
        {
          carrierDot: '1234567',
          factorSlug: 'apex-capital',
          loadId: 'load-test-001',
        },
        { pool: pool as unknown as import('pg').Pool },
      );

      expect(result.envelopeId).toBeTruthy();
      expect(result.signUrl).toBeTruthy();

      // Verify DB row
      const { rows } = await client.query(
        `SELECT provider_envelope_id, provider, state
         FROM "${schemaName}".noa_envelopes
         WHERE external_id = $1`,
        [result.envelopeId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].provider).toBe('dropbox-sign');
      expect(rows[0].provider_envelope_id).toBeTruthy();
      createdEnvelopeId = rows[0].provider_envelope_id;

      // Verify the envelope exists in Dropbox Sign
      const DropboxSign = await import('@dropbox/sign');
      const api = new DropboxSign.SignatureRequestApi();
      api.username = DROPBOX_SIGN_API_KEY!;
      const { body } = await api.signatureRequestGet(createdEnvelopeId!);
      expect(body.signatureRequest?.signatureRequestId).toBe(createdEnvelopeId);
    } finally {
      await pool.end();
    }
  });

  it.skipIf(!SKIP_TEST)('DROPBOX_SIGN_API_KEY absent — test skipped cleanly', () => {
    console.warn('Test 13 SKIPPED: DROPBOX_SIGN_API_KEY not in Doppler');
  });
});
