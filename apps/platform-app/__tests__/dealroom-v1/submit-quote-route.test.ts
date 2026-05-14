import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('POST /api/financing/submit-quote', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('LTH_DB_POOLED_URL', ''); // No DB — use in-memory fallback
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns submissionId + dealRoomUrl for valid body', async () => {
    const { _clearMemoryStore } = await import('@/lib/quote-submissions/queries');
    _clearMemoryStore();

    const { POST } = await import('@/app/api/financing/submit-quote/route');

    const req = new Request('http://localhost/api/financing/submit-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dot: '5555555',
        factorSlug: 'apex-capital',
        quoteId: 'q-test-1',
        rate: '3.5%',
        recourseLabel: 'Recourse',
        fundingSpeed: 'Same day',
        factorName: 'Apex Capital',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json() as { submissionId: string; dealRoomUrl: string; stage: string };
    expect(data.submissionId).toBeTruthy();
    expect(data.dealRoomUrl).toBe('/dashboard/5555555/financing/apex-capital');
    expect(data.stage).toBe('submitted');
  });

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/financing/submit-quote/route');

    const req = new Request('http://localhost/api/financing/submit-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dot: '5555555' }), // missing factorSlug etc
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('is idempotent — returns existing submission on duplicate', async () => {
    const { _clearMemoryStore } = await import('@/lib/quote-submissions/queries');
    _clearMemoryStore();

    const { POST } = await import('@/app/api/financing/submit-quote/route');

    const body = JSON.stringify({
      dot: '4444444',
      factorSlug: 'triumph-pay',
      quoteId: 'q-test-idem',
      rate: '4%',
      recourseLabel: 'Non-recourse',
      fundingSpeed: 'Next day',
    });

    const res1 = await POST(new Request('http://localhost/api/financing/submit-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }));
    const data1 = await res1.json() as { submissionId: string };

    const res2 = await POST(new Request('http://localhost/api/financing/submit-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }));
    const data2 = await res2.json() as { submissionId: string };

    expect(data1.submissionId).toBe(data2.submissionId);
    expect(res2.status).toBe(200);
  });
});
