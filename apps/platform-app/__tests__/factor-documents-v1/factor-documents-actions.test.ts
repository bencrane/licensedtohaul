/**
 * factor-documents actions tests — in-memory fallback path.
 * All DB operations fall through to the in-memory store since LTH_DB_POOLED_URL is unset.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const FACTOR_SLUG = 'apex-capital';
const CARRIER_DOT = '1234567';
const CARRIER_EMAIL = 'carrier@test.com';
const TEMPLATE_ID = '42';

describe('factor-documents/actions — in-memory fallback', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('LTH_DB_POOLED_URL', '');
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', 'test-secret');

    // Seed in-memory partner config so sendDocument finds the template ID
    const { _memSetConfig, _memClear } = await import('@/lib/factor-documents/queries');
    _memClear();
    _memSetConfig({
      factor_slug: FACTOR_SLUG,
      documenso_noa_template_id: TEMPLATE_ID,
      documenso_master_agreement_template_id: '99',
      documenso_addendum_template_id: null,
      documenso_side_letter_template_id: null,
      updated_at: new Date(),
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    const { _memClear } = await import('@/lib/factor-documents/queries');
    _memClear();
  });

  it('sendDocument inserts a factor_documents row with correct state and signing tokens', async () => {
    vi.doMock('@/lib/signature/index', () => ({
      getSignatureProvider: () => ({
        name: 'fake',
        createDocumentFromTemplate: vi.fn().mockResolvedValue({
          documentId: 'fake-tmpl-doc-42-ext-1',
          recipients: [
            { role: 'carrier', email: CARRIER_EMAIL, signingToken: 'fake-token-carrier' },
            { role: 'factor', email: 'factor@apex.com', signingToken: 'fake-token-factor' },
          ],
        }),
        createEnvelope: vi.fn(),
        getEnvelope: vi.fn(),
        voidEnvelope: vi.fn(),
        getDownloadUrl: vi.fn(),
        handleWebhook: vi.fn(),
      }),
    }));

    const { sendDocument } = await import('@/lib/factor-documents/actions');
    const { getDocumentsForCarrier } = await import('@/lib/factor-documents/queries');

    const result = await sendDocument({
      factorSlug: FACTOR_SLUG,
      carrierDot: CARRIER_DOT,
      carrierEmail: CARRIER_EMAIL,
      documentKind: 'noa',
    });

    expect(result.documentId).toBeTruthy();
    expect(result.signingTokens.carrier).toBe('fake-token-carrier');
    expect(result.signingTokens.factor).toBe('fake-token-factor');

    const docs = await getDocumentsForCarrier(CARRIER_DOT, FACTOR_SLUG);
    expect(docs).toHaveLength(1);
    expect(docs[0].state).toBe('sent');
    expect(docs[0].document_kind).toBe('noa');
    expect(docs[0].carrier_signing_token).toBe('fake-token-carrier');
    expect(docs[0].factor_signing_token).toBe('fake-token-factor');
  });

  it('sendDocument throws when template ID is null for the document kind', async () => {
    vi.doMock('@/lib/signature/index', () => ({
      getSignatureProvider: () => ({
        name: 'fake',
        createDocumentFromTemplate: vi.fn(),
        createEnvelope: vi.fn(),
        getEnvelope: vi.fn(),
        voidEnvelope: vi.fn(),
        getDownloadUrl: vi.fn(),
        handleWebhook: vi.fn(),
      }),
    }));

    const { _memSetConfig } = await import('@/lib/factor-documents/queries');
    _memSetConfig({
      factor_slug: FACTOR_SLUG,
      documenso_noa_template_id: TEMPLATE_ID,
      documenso_master_agreement_template_id: null, // explicitly null
      documenso_addendum_template_id: null,
      documenso_side_letter_template_id: null,
      updated_at: new Date(),
    });

    const { sendDocument } = await import('@/lib/factor-documents/actions');

    await expect(
      sendDocument({
        factorSlug: FACTOR_SLUG,
        carrierDot: CARRIER_DOT,
        carrierEmail: CARRIER_EMAIL,
        documentKind: 'addendum', // no template configured
      }),
    ).rejects.toThrow('No template ID configured');
  });

  it('markCarrierSigned updates state to signed_by_carrier for dual-signer doc', async () => {
    vi.doMock('@/lib/signature/index', () => ({
      getSignatureProvider: () => ({
        name: 'fake',
        createDocumentFromTemplate: vi.fn().mockResolvedValue({
          documentId: 'fake-dual-doc',
          recipients: [
            { role: 'carrier', email: CARRIER_EMAIL, signingToken: 'carrier-tok-dual' },
            { role: 'factor', email: 'factor@apex.com', signingToken: 'factor-tok-dual' },
          ],
        }),
        createEnvelope: vi.fn(),
        getEnvelope: vi.fn(),
        voidEnvelope: vi.fn(),
        getDownloadUrl: vi.fn(),
        handleWebhook: vi.fn(),
      }),
    }));

    const { sendDocument, markCarrierSigned } = await import('@/lib/factor-documents/actions');
    const sendResult = await sendDocument({
      factorSlug: FACTOR_SLUG,
      carrierDot: CARRIER_DOT,
      carrierEmail: CARRIER_EMAIL,
      documentKind: 'noa',
    });

    const updated = await markCarrierSigned({ documentId: sendResult.documentId });

    expect(updated).not.toBeNull();
    // Dual-signer (factor_signing_token present) → signed_by_carrier, not completed
    expect(updated!.state).toBe('signed_by_carrier');
    expect(updated!.carrier_signed_at).toBeInstanceOf(Date);
  });

  it('markCarrierSigned sets state=completed for single-signer doc', async () => {
    vi.doMock('@/lib/signature/index', () => ({
      getSignatureProvider: () => ({
        name: 'fake',
        createDocumentFromTemplate: vi.fn().mockResolvedValue({
          documentId: 'fake-single-doc',
          recipients: [
            { role: 'carrier', email: CARRIER_EMAIL, signingToken: 'tok-single' },
            // No factor token
          ],
        }),
        createEnvelope: vi.fn(),
        getEnvelope: vi.fn(),
        voidEnvelope: vi.fn(),
        getDownloadUrl: vi.fn(),
        handleWebhook: vi.fn(),
      }),
    }));

    const { sendDocument, markCarrierSigned } = await import('@/lib/factor-documents/actions');
    const sendResult = await sendDocument({
      factorSlug: FACTOR_SLUG,
      carrierDot: CARRIER_DOT,
      carrierEmail: CARRIER_EMAIL,
      documentKind: 'noa',
    });

    const updated = await markCarrierSigned({ documentId: sendResult.documentId });
    expect(updated!.state).toBe('completed');
  });

  it('markCompleted for non-NOA kind updates factor_documents only (no FoR in-memory)', async () => {
    vi.doMock('@/lib/signature/index', () => ({
      getSignatureProvider: () => ({
        name: 'fake',
        createDocumentFromTemplate: vi.fn().mockResolvedValue({
          documentId: 'fake-ma-doc',
          recipients: [{ role: 'carrier', email: CARRIER_EMAIL, signingToken: 'tok-ma' }],
        }),
        createEnvelope: vi.fn(),
        getEnvelope: vi.fn(),
        voidEnvelope: vi.fn(),
        getDownloadUrl: vi.fn(),
        handleWebhook: vi.fn(),
      }),
    }));

    const { sendDocument, markCompleted } = await import('@/lib/factor-documents/actions');
    const sendResult = await sendDocument({
      factorSlug: FACTOR_SLUG,
      carrierDot: CARRIER_DOT,
      carrierEmail: CARRIER_EMAIL,
      documentKind: 'master_agreement',
    });

    const updated = await markCompleted({ documentId: sendResult.documentId });
    expect(updated!.state).toBe('completed');
    expect(updated!.completed_at).toBeInstanceOf(Date);
  });

  it('markRejected sets state=rejected', async () => {
    vi.doMock('@/lib/signature/index', () => ({
      getSignatureProvider: () => ({
        name: 'fake',
        createDocumentFromTemplate: vi.fn().mockResolvedValue({
          documentId: 'fake-reject-doc',
          recipients: [{ role: 'carrier', email: CARRIER_EMAIL, signingToken: 'tok-r' }],
        }),
        createEnvelope: vi.fn(),
        getEnvelope: vi.fn(),
        voidEnvelope: vi.fn(),
        getDownloadUrl: vi.fn(),
        handleWebhook: vi.fn(),
      }),
    }));

    const { sendDocument, markRejected } = await import('@/lib/factor-documents/actions');
    const sendResult = await sendDocument({
      factorSlug: FACTOR_SLUG,
      carrierDot: CARRIER_DOT,
      carrierEmail: CARRIER_EMAIL,
      documentKind: 'noa',
    });

    const updated = await markRejected({ documentId: sendResult.documentId, reason: 'carrier declined' });
    expect(updated!.state).toBe('rejected');
  });
});
