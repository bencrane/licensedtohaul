import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('DocumensoProvider.createEnvelope', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubEnv('DOCUMENSO_API_URL', 'https://app.documenso.com');
    vi.stubEnv('DOCUMENSO_API_KEY', 'test-api-key-123');
    vi.stubEnv('DOCUMENSO_WEBHOOK_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('POSTs to /api/v1/documents with correct shape', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 42,
        status: 'PENDING',
        recipients: [
          { id: 1, name: 'Test Carrier', email: 'carrier@test.com', role: 'SIGNER', token: 'abc123tok' },
        ],
      }),
    });

    const provider = new DocumensoProvider();
    const result = await provider.createEnvelope({
      externalId: 'ext-uuid-1',
      subject: 'Notice of Assignment — Apex Capital',
      signers: [{ role: 'carrier', name: 'Test Carrier', email: 'carrier@test.com' }],
      mode: 'embedded',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://app.documenso.com/api/v1/documents');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.title).toBe('Notice of Assignment — Apex Capital');
    expect(body.externalId).toBe('ext-uuid-1');
    expect(Array.isArray(body.recipients)).toBe(true);

    expect(result.providerEnvelopeId).toBe('42');
    expect(result.status).toBe('sent');
  });

  it('assembles sign URL as ${apiUrl}/sign/${token}', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 99,
        status: 'PENDING',
        recipients: [
          { id: 1, name: 'Carrier', email: 'c@test.com', role: 'SIGNER', token: 'mytoken456' },
        ],
      }),
    });

    const provider = new DocumensoProvider();
    const result = await provider.createEnvelope({
      externalId: 'ext-2',
      subject: 'Test NOA',
      signers: [{ role: 'carrier', name: 'Carrier', email: 'c@test.com' }],
      mode: 'embedded',
    });

    expect(result.signUrls['carrier']).toBe('https://app.documenso.com/sign/mytoken456');
    // Assert URL shape ends with /sign/<token>
    expect(result.signUrls['carrier']).toMatch(/\/sign\/[a-zA-Z0-9]+$/);
  });

  it('throws on non-OK response', async () => {
    const { DocumensoProvider } = await import('@/lib/signature/documenso');

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service unavailable',
    });

    const provider = new DocumensoProvider();
    await expect(
      provider.createEnvelope({
        externalId: 'ext-3',
        subject: 'Test',
        signers: [{ role: 'carrier', name: 'C', email: 'c@test.com' }],
        mode: 'embedded',
      }),
    ).rejects.toThrow('503');
  });
});
