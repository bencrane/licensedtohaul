// Tests the in-memory fallback path for lib/quote-submissions/
// Runs without LTH_DB_POOLED_URL — exercises the Map-backed store.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('quote-submissions in-memory fallback (no DB)', () => {
  beforeEach(async () => {
    vi.resetModules();
    // Ensure DB env is absent to force fallback path
    vi.stubEnv('LTH_DB_POOLED_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('submitQuote inserts a new submission into the in-memory store', async () => {
    const { submitQuote } = await import('@/lib/quote-submissions/actions');
    const { _clearMemoryStore } = await import('@/lib/quote-submissions/queries');
    _clearMemoryStore();

    const result = await submitQuote({
      carrierDot: '1234567',
      factorSlug: 'apex-capital',
      quoteId: 'q-001',
      rate: '3.5%',
      recourseLabel: 'Recourse',
      fundingSpeed: 'Same day',
    });

    expect(result.carrierDot).toBe('1234567');
    expect(result.factorSlug).toBe('apex-capital');
    expect(result.stage).toBe('submitted');
    expect(result.id).toBeTruthy();
  });

  it('submitQuote is idempotent — re-submit returns existing', async () => {
    const { submitQuote } = await import('@/lib/quote-submissions/actions');
    const { _clearMemoryStore } = await import('@/lib/quote-submissions/queries');
    _clearMemoryStore();

    const first = await submitQuote({
      carrierDot: '1234567',
      factorSlug: 'triumph-pay',
      quoteId: 'q-002',
      rate: '3.8%',
      recourseLabel: 'Non-recourse',
      fundingSpeed: 'Next day',
    });

    const second = await submitQuote({
      carrierDot: '1234567',
      factorSlug: 'triumph-pay',
      quoteId: 'q-002-dup',
      rate: '3.8%',
      recourseLabel: 'Non-recourse',
      fundingSpeed: 'Next day',
    });

    expect(second.id).toBe(first.id);
  });

  it('getSubmission returns the stored submission', async () => {
    const { submitQuote } = await import('@/lib/quote-submissions/actions');
    const { getSubmission, _clearMemoryStore } = await import('@/lib/quote-submissions/queries');
    _clearMemoryStore();

    await submitQuote({
      carrierDot: '9999999',
      factorSlug: 'riviera-finance',
      quoteId: 'q-003',
      rate: '4%',
      recourseLabel: 'Recourse',
      fundingSpeed: '2 days',
    });

    const found = await getSubmission('9999999', 'riviera-finance');
    expect(found).not.toBeNull();
    expect(found!.quoteId).toBe('q-003');
  });

  it('transitionStage rejects invalid transitions', async () => {
    const { submitQuote, transitionStage } = await import('@/lib/quote-submissions/actions');
    const { _clearMemoryStore } = await import('@/lib/quote-submissions/queries');
    _clearMemoryStore();

    const sub = await submitQuote({
      carrierDot: '8888888',
      factorSlug: 'apex-capital',
      quoteId: 'q-004',
      rate: '3%',
      recourseLabel: 'Recourse',
      fundingSpeed: 'Same day',
    });

    // submitted → active is not a valid transition
    await expect(
      transitionStage({ submissionId: sub.id, toStage: 'active', actor: 'factor' }),
    ).rejects.toThrow('Invalid stage transition');
  });

  it('transitionStage advances stage on valid transition', async () => {
    const { submitQuote, transitionStage } = await import('@/lib/quote-submissions/actions');
    const { _clearMemoryStore } = await import('@/lib/quote-submissions/queries');
    _clearMemoryStore();

    const sub = await submitQuote({
      carrierDot: '7777777',
      factorSlug: 'triumph-pay',
      quoteId: 'q-005',
      rate: '3%',
      recourseLabel: 'Recourse',
      fundingSpeed: 'Same day',
    });

    const updated = await transitionStage({
      submissionId: sub.id,
      toStage: 'underwriting',
      actor: 'factor',
    });

    expect(updated.stage).toBe('underwriting');
  });

  it('getOpenSubmissionsForCarrier returns only non-terminal submissions', async () => {
    const { submitQuote, transitionStage } = await import('@/lib/quote-submissions/actions');
    const { getOpenSubmissionsForCarrier, _clearMemoryStore } = await import('@/lib/quote-submissions/queries');
    _clearMemoryStore();

    const dot = '6666666';

    const s1 = await submitQuote({
      carrierDot: dot,
      factorSlug: 'apex-capital',
      quoteId: 'q-open',
      rate: '3%',
      recourseLabel: 'R',
      fundingSpeed: 'SD',
    });

    const s2 = await submitQuote({
      carrierDot: dot,
      factorSlug: 'triumph-pay',
      quoteId: 'q-declined',
      rate: '4%',
      recourseLabel: 'NR',
      fundingSpeed: 'ND',
    });

    await transitionStage({ submissionId: s2.id, toStage: 'declined', actor: 'factor' });

    const open = await getOpenSubmissionsForCarrier(dot);
    expect(open.length).toBe(1);
    expect(open[0].id).toBe(s1.id);
  });
});
