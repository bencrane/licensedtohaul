import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const TEMPLATE_ID = 12345;
const API_KEY = 'test-api-key-v2';
const API_URL = 'https://app.documenso.com';

describe('DocumensoProvider v2 — createDocumentFromTemplate', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubEnv('DOCUMENSO_API_URL', API_URL);
    vi.stubEnv('DOCUMENSO_API_KEY', API_KEY);
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('POSTs to POST /api/v2/template/use with correct body and Authorization: api_<key>', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'envelope_999',
        status: 'PENDING',
        recipients: [
          { id: 1, name: 'Carrier Co', email: 'carrier@test.com', role: 'carrier', token: 'carrier-tok-abc' },
          { id: 2, name: 'Apex Capital', email: 'factor@apex.com', role: 'factor', token: 'factor-tok-xyz' },
        ],
      }),
    });

    const result = await provider.createDocumentFromTemplate({
      templateId: TEMPLATE_ID,
      externalId: 'ext-uuid-1',
      distributeDocument: true,
      signers: [
        { recipientId: 1, role: 'carrier', name: 'Carrier Co', email: 'carrier@test.com' },
        { recipientId: 2, role: 'factor', name: 'Apex Capital', email: 'factor@apex.com' },
      ],
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];

    // Correct URL
    expect(url).toBe(`${API_URL}/api/v2/template/use`);
    expect(opts.method).toBe('POST');

    // Correct auth header
    const headers = opts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`api_${API_KEY}`);

    // Correct body shape
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.templateId).toBe(TEMPLATE_ID);
    expect(body.distributeDocument).toBe(true);
    expect(body.externalId).toBe('ext-uuid-1');
    expect(Array.isArray(body.recipients)).toBe(true);
    const recipients = body.recipients as Array<{ id: number; email: string; name?: string }>;
    expect(recipients[0].id).toBe(1);
    expect(recipients[0].email).toBe('carrier@test.com');
    expect(recipients[1].id).toBe(2);
    expect(recipients[1].email).toBe('factor@apex.com');

    // Result shape
    expect(result.documentId).toBe('envelope_999');
    expect(result.recipients).toHaveLength(2);
    expect(result.recipients[0].role).toBe('carrier');
    expect(result.recipients[0].signingToken).toBe('carrier-tok-abc');
    expect(result.recipients[1].role).toBe('factor');
    expect(result.recipients[1].signingToken).toBe('factor-tok-xyz');
  });

  it('getEnvelope hits GET /api/v2/documents/{id} with correct auth', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'envelope_123',
        externalId: 'ext-abc',
        status: 'COMPLETED',
        recipients: [],
      }),
    });

    const snap = await provider.getEnvelope('envelope_123');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/api/v2/documents/envelope_123`);
    expect((opts.headers as Record<string, string>)['Authorization']).toBe(`api_${API_KEY}`);
    expect(snap.providerEnvelopeId).toBe('envelope_123');
    expect(snap.status).toBe('completed');
  });

  it('voidEnvelope calls DELETE /api/v2/documents/{id}', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

    await provider.voidEnvelope('envelope_456', 'test reason');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/api/v2/documents/envelope_456`);
    expect(opts.method).toBe('DELETE');
  });

  it('getDownloadUrl calls GET /api/v2/documents/{id}/download', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://cdn.documenso.com/signed.pdf', expiresAt: '2026-06-01T00:00:00Z' }),
    });

    const result = await provider.getDownloadUrl('envelope_789', 'signed');

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/api/v2/documents/envelope_789/download`);
    expect(result.url).toBe('https://cdn.documenso.com/signed.pdf');
  });

  it('throws on non-OK response from createDocumentFromTemplate', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');
    const provider = new DocumensoProvider();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => 'Template not found',
    });

    await expect(
      provider.createDocumentFromTemplate({
        templateId: 99999,
        signers: [{ recipientId: 1, role: 'carrier', name: 'C', email: 'c@test.com' }],
      }),
    ).rejects.toThrow('422');
  });
});
