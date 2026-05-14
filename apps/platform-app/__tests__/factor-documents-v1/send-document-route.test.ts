import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const FACTOR_SLUG = 'test-factor';
const CARRIER_DOT = '7654321';
const CARRIER_EMAIL = 'carrier@test.com';
const TEMPLATE_ID = '55';

describe('POST /api/partner/[slug]/documents/send', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('LTH_DB_POOLED_URL', '');
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-key');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', 'test-secret');

    // Seed partner config with NOA template
    const { _memSetConfig, _memClear } = await import('@/lib/factor-documents/queries');
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

  it('returns 422 when template ID is null for the document kind', async () => {
    const { POST } = await import(`@/app/api/partner/[slug]/documents/send/route`);

    const req = new Request(
      `http://localhost/api/partner/${FACTOR_SLUG}/documents/send`,
      {
        method: 'POST',
        body: JSON.stringify({
          carrierDot: CARRIER_DOT,
          carrierEmail: CARRIER_EMAIL,
          documentKind: 'master_agreement', // no template configured
        }),
        headers: { 'content-type': 'application/json' },
      },
    );

    const res = await POST(req, { params: Promise.resolve({ slug: FACTOR_SLUG }) });
    expect(res.status).toBe(422);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/No template ID configured/i);
  });

  it('returns 422 for missing required fields', async () => {
    const { POST } = await import(`@/app/api/partner/[slug]/documents/send/route`);

    const req = new Request(
      `http://localhost/api/partner/${FACTOR_SLUG}/documents/send`,
      {
        method: 'POST',
        body: JSON.stringify({ carrierDot: CARRIER_DOT }),
        headers: { 'content-type': 'application/json' },
      },
    );

    const res = await POST(req, { params: Promise.resolve({ slug: FACTOR_SLUG }) });
    expect(res.status).toBe(400);
  });

  it('returns 200 with documentId when template is configured', async () => {
    // Mock the provider
    vi.mock('@/lib/signature/index', () => ({
      getSignatureProvider: () => ({
        createDocumentFromTemplate: vi.fn().mockResolvedValue({
          documentId: 'envelope_100',
          recipients: [
            { role: 'carrier', email: CARRIER_EMAIL, signingToken: 'carrier-tok' },
          ],
        }),
        createEnvelope: vi.fn(),
        getEnvelope: vi.fn(),
        voidEnvelope: vi.fn(),
        getDownloadUrl: vi.fn(),
        handleWebhook: vi.fn(),
      }),
    }));

    const { POST } = await import(`@/app/api/partner/[slug]/documents/send/route`);

    const req = new Request(
      `http://localhost/api/partner/${FACTOR_SLUG}/documents/send`,
      {
        method: 'POST',
        body: JSON.stringify({
          carrierDot: CARRIER_DOT,
          carrierEmail: CARRIER_EMAIL,
          documentKind: 'noa',
        }),
        headers: { 'content-type': 'application/json' },
      },
    );

    const res = await POST(req, { params: Promise.resolve({ slug: FACTOR_SLUG }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { documentId: string; dealRoomUrl: string | null };
    expect(data.documentId).toBeTruthy();
    // dealRoomUrl contains the carrier signing token
    expect(data.dealRoomUrl).toContain('carrier-tok');
  });
});
