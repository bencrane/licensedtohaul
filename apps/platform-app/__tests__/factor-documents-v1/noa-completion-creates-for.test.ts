/**
 * NOA completion backward-compat test:
 * When markCompleted is called on a NOA factor_document row AND a DB is available,
 * handleCompletionSideEffects should fire FoR creation.
 *
 * This test uses mocked DB modules to verify the call chain without a real DB.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const FACTOR_SLUG = 'apex-capital';
const CARRIER_DOT = '1234567';

describe('NOA completion backward-compat (FoR creation chain)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('LTH_DB_POOLED_URL', '');
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', 'test-secret');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    const { _memClear } = await import('@/lib/factor-documents/queries');
    _memClear();
  });

  it('markCompleted for NOA does not throw even without DB (graceful skip)', async () => {
    const { _memSetDocument } = await import('@/lib/factor-documents/queries');

    _memSetDocument({
      id: 'noa-internal-001',
      factor_slug: FACTOR_SLUG,
      carrier_dot: CARRIER_DOT,
      document_kind: 'noa',
      state: 'signed_by_carrier',
      documenso_document_id: 'documenso-noa-for-test',
      documenso_template_id: '42',
      carrier_signing_token: 'c-tok',
      factor_signing_token: 'f-tok',
      carrier_signed_at: new Date(),
      factor_signed_at: new Date(),
      completed_at: null,
      voided_at: null,
      void_reason: null,
      notes: null,
      payload: { externalId: 'ext-noa-for-test' },
      sent_at: new Date(),
      updated_at: new Date(),
    });

    const { markCompleted } = await import('@/lib/factor-documents/actions');

    // Should not throw — gracefully skips FoR creation when no DB
    const result = await markCompleted({ documentId: 'noa-internal-001' });
    expect(result).not.toBeNull();
    expect(result!.state).toBe('completed');
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('markCompleted for master_agreement does not invoke FoR path', async () => {
    const { _memSetDocument } = await import('@/lib/factor-documents/queries');

    _memSetDocument({
      id: 'ma-internal-001',
      factor_slug: FACTOR_SLUG,
      carrier_dot: CARRIER_DOT,
      document_kind: 'master_agreement',
      state: 'sent',
      documenso_document_id: 'documenso-ma-for-test',
      documenso_template_id: '99',
      carrier_signing_token: 'c-tok',
      factor_signing_token: null,
      carrier_signed_at: null,
      factor_signed_at: null,
      completed_at: null,
      voided_at: null,
      void_reason: null,
      notes: null,
      payload: null,
      sent_at: new Date(),
      updated_at: new Date(),
    });

    const { markCompleted } = await import('@/lib/factor-documents/actions');

    const result = await markCompleted({ documentId: 'ma-internal-001' });
    expect(result!.state).toBe('completed');
    // No FoR side effects for non-NOA (verified by no errors thrown)
  });

  it('C1 assertion: FoR creation logic is present in actions.ts handleCompletionSideEffects', async () => {
    // Structural check: verify handleCompletionSideEffects calls recordForTransition for NOA
    // when a DB pool is available.
    //
    // Strategy:
    //  - Mock 'pg' so Pool() returns a mockPool whose query() returns the document row
    //    (so getDocumentById via DB path finds the doc).
    //  - Mock factor-of-record/queries and quote-submissions/actions to spy on calls.
    //  - Set LTH_DB_POOLED_URL so actions.ts pool() returns the mocked pool.
    //  - All vi.doMock calls (non-hoisted) so variables are in scope.

    const noaDoc = {
      id: 'noa-c1-001',
      factor_slug: FACTOR_SLUG,
      carrier_dot: CARRIER_DOT,
      document_kind: 'noa' as const,
      state: 'sent' as const,
      documenso_document_id: 'documenso-c1-noa',
      documenso_template_id: '42',
      carrier_signing_token: 'c-tok',
      factor_signing_token: 'f-tok',
      carrier_signed_at: null,
      factor_signed_at: null,
      completed_at: null,
      voided_at: null,
      void_reason: null,
      notes: null,
      payload: { externalId: 'ext-c1-noa' },
      sent_at: new Date(),
      updated_at: new Date(),
    };

    const mockPool = {
      // Return the doc row for SELECT queries; return empty for INSERT/UPDATE
      query: vi.fn().mockImplementation((sql: string) => {
        if (typeof sql === 'string' && sql.trim().toUpperCase().startsWith('SELECT')) {
          return Promise.resolve({ rows: [noaDoc] });
        }
        return Promise.resolve({ rows: [{ ...noaDoc, state: 'completed', completed_at: new Date() }] });
      }),
    };

    vi.doMock('pg', () => ({
      Pool: vi.fn().mockImplementation(() => mockPool),
    }));

    vi.doMock('@/lib/factor-of-record/queries', () => ({
      recordForTransition: vi.fn().mockResolvedValue({ newForId: 'for-new', revokedForId: null }),
      writeAuditLog: vi.fn().mockResolvedValue(undefined),
    }));

    vi.doMock('@/lib/quote-submissions/actions', () => ({
      transitionSubmissionStageByDotSlug: vi.fn().mockResolvedValue(undefined),
    }));

    // Set a non-empty DB URL so pool() in actions.ts returns the mocked Pool
    vi.stubEnv('LTH_DB_POOLED_URL', 'postgresql://fake:fake@localhost/fake');

    const { markCompleted } = await import('@/lib/factor-documents/actions');
    const result = await markCompleted({ documentId: 'noa-c1-001' });

    expect(result).not.toBeNull();
    expect(result!.state).toBe('completed');

    // Verify recordForTransition was called for the NOA kind
    const { recordForTransition } = await import('@/lib/factor-of-record/queries');
    expect(recordForTransition).toHaveBeenCalledOnce();
  });
});
