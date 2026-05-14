/**
 * DOCUMENT_SIGNED webhook — single-signer and multi-signer paths.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const WEBHOOK_SECRET = 'doc-signed-test-secret';
const FACTOR_SLUG = 'test-factor';
const CARRIER_DOT = '1234567';
const TEMPLATE_ID = '42';
const CARRIER_EMAIL = 'carrier@test.com';
const FACTOR_EMAIL = 'factor@test.com';

function makeSignedPayload(signerRole: 'carrier' | 'factor', documentId: string, signerEmail: string): string {
  return JSON.stringify({
    event: 'DOCUMENT_SIGNED',
    payload: {
      id: documentId,
      externalId: 'ext-' + documentId,
      status: 'PENDING',
      currentSigner: { email: signerEmail },
      recipients: [
        { id: 1, name: 'Carrier', email: CARRIER_EMAIL, role: 'carrier', token: 'c-tok', signingStatus: signerRole === 'carrier' ? 'SIGNED' : 'PENDING' },
        { id: 2, name: 'Factor', email: FACTOR_EMAIL, role: 'factor', token: 'f-tok', signingStatus: signerRole === 'factor' ? 'SIGNED' : 'PENDING' },
      ],
    },
  });
}

describe('DOCUMENT_SIGNED webhook routing', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('LTH_DB_POOLED_URL', '');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', WEBHOOK_SECRET);
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');

    // Seed memory
    const { _memSetConfig, _memSetDocument, _memClear } = await import('@/lib/factor-documents/queries');
    _memClear();
    _memSetConfig({
      factor_slug: FACTOR_SLUG,
      documenso_noa_template_id: TEMPLATE_ID,
      documenso_master_agreement_template_id: null,
      documenso_addendum_template_id: null,
      documenso_side_letter_template_id: null,
      updated_at: new Date(),
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    const { _memClear } = await import('@/lib/factor-documents/queries');
    _memClear();
  });

  it('single-signer NOA: DOCUMENT_SIGNED triggers markCarrierSigned which marks completed', async () => {
    const { _memSetDocument } = await import('@/lib/factor-documents/queries');
    const docId = 'documenso-single-001';
    const internalId = 'internal-single-001';

    _memSetDocument({
      id: internalId,
      factor_slug: FACTOR_SLUG,
      carrier_dot: CARRIER_DOT,
      document_kind: 'noa',
      state: 'sent',
      documenso_document_id: docId,
      documenso_template_id: TEMPLATE_ID,
      carrier_signing_token: 'c-tok',
      factor_signing_token: null, // single-signer: no factor token
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
    const body = JSON.stringify({
      event: 'DOCUMENT_SIGNED',
      payload: {
        id: docId,
        externalId: 'ext-' + docId,
        status: 'PENDING',
        currentSigner: { email: CARRIER_EMAIL },
        recipients: [
          { id: 1, name: 'Carrier', email: CARRIER_EMAIL, role: 'carrier', token: 'c-tok', signingStatus: 'SIGNED' },
        ],
      },
    });

    const req = new Request('http://localhost/api/webhooks/signature?provider=documenso', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        'x-documenso-secret': WEBHOOK_SECRET,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const { getDocumentByDocumensoId } = await import('@/lib/factor-documents/queries');
    const updated = await getDocumentByDocumensoId(docId);
    expect(updated).not.toBeNull();
    // Single signer → carrier signed → completed immediately
    expect(updated!.state).toBe('completed');
  });

  it('multi-signer NOA: DOCUMENT_SIGNED by carrier → signed_by_carrier, then by factor → completed', async () => {
    const { _memSetDocument, getDocumentByDocumensoId } = await import('@/lib/factor-documents/queries');
    const docId = 'documenso-multi-001';
    const internalId = 'internal-multi-001';

    _memSetDocument({
      id: internalId,
      factor_slug: FACTOR_SLUG,
      carrier_dot: CARRIER_DOT,
      document_kind: 'noa',
      state: 'sent',
      documenso_document_id: docId,
      documenso_template_id: TEMPLATE_ID,
      carrier_signing_token: 'c-tok',
      factor_signing_token: 'f-tok',
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

    // Step 1: carrier signs
    const carrierSignBody = makeSignedPayload('carrier', docId, CARRIER_EMAIL);
    const req1 = new Request('http://localhost/api/webhooks/signature?provider=documenso', {
      method: 'POST',
      body: carrierSignBody,
      headers: { 'content-type': 'application/json', 'x-documenso-secret': WEBHOOK_SECRET },
    });
    await POST(req1);

    const afterCarrier = await getDocumentByDocumensoId(docId);
    expect(afterCarrier!.state).toBe('signed_by_carrier');
    expect(afterCarrier!.carrier_signed_at).toBeInstanceOf(Date);

    // Step 2: factor signs
    const factorSignBody = makeSignedPayload('factor', docId, FACTOR_EMAIL);
    const req2 = new Request('http://localhost/api/webhooks/signature?provider=documenso', {
      method: 'POST',
      body: factorSignBody,
      headers: { 'content-type': 'application/json', 'x-documenso-secret': WEBHOOK_SECRET },
    });
    await POST(req2);

    const afterFactor = await getDocumentByDocumensoId(docId);
    expect(afterFactor!.state).toBe('completed');
  });
});
