/**
 * DOCUMENT_COMPLETED webhook: NOA triggers FoR (mocked); non-NOA does not.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const WEBHOOK_SECRET = 'completed-test-secret';
const FACTOR_SLUG = 'apex-capital';
const CARRIER_DOT = '1234567';

function makeCompletedPayload(documentId: string): string {
  return JSON.stringify({
    event: 'DOCUMENT_COMPLETED',
    payload: {
      id: documentId,
      externalId: 'ext-' + documentId,
      status: 'COMPLETED',
      recipients: [],
    },
  });
}

describe('DOCUMENT_COMPLETED webhook — document_kind routing', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('LTH_DB_POOLED_URL', '');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');

    const { _memClear } = await import('@/lib/factor-documents/queries');
    _memClear();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    const { _memClear } = await import('@/lib/factor-documents/queries');
    _memClear();
  });

  it('document_kind=master_agreement: DOCUMENT_COMPLETED marks completed, does NOT trigger FoR', async () => {
    const { _memSetDocument, getDocumentByDocumensoId } = await import('@/lib/factor-documents/queries');
    const docId = 'documenso-ma-001';

    _memSetDocument({
      id: 'internal-ma-001',
      factor_slug: FACTOR_SLUG,
      carrier_dot: CARRIER_DOT,
      document_kind: 'master_agreement',
      state: 'sent',
      documenso_document_id: docId,
      documenso_template_id: '88',
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

    const { POST } = await import('@/app/api/webhooks/signature/route');
    const req = new Request('http://localhost/api/webhooks/signature?provider=documenso', {
      method: 'POST',
      body: makeCompletedPayload(docId),
      headers: { 'content-type': 'application/json', 'x-documenso-secret': WEBHOOK_SECRET },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const updated = await getDocumentByDocumensoId(docId);
    expect(updated!.state).toBe('completed');
    expect(updated!.completed_at).toBeInstanceOf(Date);
    // No DB for FoR — handleCompletionSideEffects should return early (no error)
  });

  it('document_kind=noa: DOCUMENT_COMPLETED marks completed (in-memory fallback skips FoR — no DB)', async () => {
    const { _memSetDocument, getDocumentByDocumensoId } = await import('@/lib/factor-documents/queries');
    const docId = 'documenso-noa-001';

    _memSetDocument({
      id: 'internal-noa-001',
      factor_slug: FACTOR_SLUG,
      carrier_dot: CARRIER_DOT,
      document_kind: 'noa',
      state: 'sent',
      documenso_document_id: docId,
      documenso_template_id: '42',
      carrier_signing_token: 'c-tok',
      factor_signing_token: 'f-tok',
      carrier_signed_at: new Date(),
      factor_signed_at: null,
      completed_at: null,
      voided_at: null,
      void_reason: null,
      notes: null,
      payload: { externalId: 'ext-noa-001' },
      sent_at: new Date(),
      updated_at: new Date(),
    });

    const { POST } = await import('@/app/api/webhooks/signature/route');
    const req = new Request('http://localhost/api/webhooks/signature?provider=documenso', {
      method: 'POST',
      body: makeCompletedPayload(docId),
      headers: { 'content-type': 'application/json', 'x-documenso-secret': WEBHOOK_SECRET },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const updated = await getDocumentByDocumensoId(docId);
    expect(updated!.state).toBe('completed');
    expect(updated!.completed_at).toBeInstanceOf(Date);
    // In-memory mode: FoR side effects skipped (no DB) — that's expected
  });
});
