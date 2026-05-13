import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { createTestSchema } from '../_harness/db';
import type { Client } from 'pg';

// Must stub env BEFORE importing production modules that read process.env at call time
vi.stubEnv('SIGNATURE_PROVIDER', 'fake');

let schemaName: string;
let client: Client;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const harness = await createTestSchema();
  schemaName = harness.schemaName;
  client = harness.client;
  cleanup = harness.cleanup;
  // Tell production modules to use this schema
  vi.stubEnv('LTH_SCHEMA', schemaName);
  vi.stubEnv('LTH_DB_POOLED_URL', process.env.LTH_DB_POOLED_URL!);
});

afterAll(async () => {
  await cleanup();
});

describe('initiateNoaSignature', () => {
  it('returns envelopeId and signUrl, and persists rows to DB', async () => {
    // Dynamic import AFTER stubEnv so the module sees the correct env values
    const { initiateNoaSignature } = await import('@/lib/factor-of-record/actions');

    const result = await initiateNoaSignature(
      { carrierDot: '1234567', factorSlug: 'apex-capital', loadId: 'load-001' },
      { pool: client as unknown as import('pg').Pool },
    );

    expect(typeof result.envelopeId).toBe('string');
    expect(result.envelopeId.length).toBeGreaterThan(0);
    expect(typeof result.signUrl).toBe('string');
    expect(result.signUrl).toContain('fake-sign');

    // Verify DB row: noa_envelopes
    const { rows: envRows } = await client.query(
      `SELECT carrier_dot, factor_slug, state, provider, external_id
       FROM "${schemaName}".noa_envelopes
       WHERE external_id = $1`,
      [result.envelopeId],
    );
    expect(envRows).toHaveLength(1);
    expect(envRows[0].carrier_dot).toBe('1234567');
    expect(envRows[0].factor_slug).toBe('apex-capital');
    expect(envRows[0].state).toBe('sent');
    expect(envRows[0].provider).toBe('fake');

    // Verify audit log
    const { rows: auditRows } = await client.query(
      `SELECT event, carrier_dot, factor_slug
       FROM "${schemaName}".factor_audit_log
       WHERE event = 'noa.initiated' AND carrier_dot = '1234567'`,
    );
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].carrier_dot).toBe('1234567');
    expect(auditRows[0].factor_slug).toBe('apex-capital');
  });
});
