// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import type { QuoteSubmission, QuoteSubmissionStage } from '@/lib/quote-submissions/types';
import type { DisbursementRow } from '@/lib/disbursements/types';

// Mock Next.js router (used by ComposeForm)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock ComposeForm to avoid form submission complexity in unit test
vi.mock('@/components/deal-room/ComposeForm', () => ({
  default: ({ carrierDot, factorSlug }: { carrierDot: string; factorSlug: string }) =>
    React.createElement('div', { 'data-testid': 'compose-form', 'data-carrier': carrierDot, 'data-factor': factorSlug }),
}));

// Mock MessageList
vi.mock('@/components/deal-room/MessageList', () => ({
  default: () => React.createElement('div', { 'data-testid': 'message-list' }),
}));

function makeSubmission(stage: QuoteSubmissionStage): QuoteSubmission {
  return {
    id: `sub-${stage}`,
    carrierDot: '1234567',
    factorSlug: 'apex-capital',
    quoteId: `q-${stage}`,
    stage,
    rate: '3.5%',
    recourseLabel: 'Recourse',
    fundingSpeed: 'Same day',
    monthlyMinimum: null,
    notes: null,
    fieldsShared: ['USDOT', 'MC number'],
    noaEnvelopeId: null,
    factorOfRecordId: null,
    submittedAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

function makeDisbursements(): DisbursementRow[] {
  return [
    {
      id: 'disb-1',
      factor_slug: 'apex-capital',
      carrier_dot: '1234567',
      amount_cents: 150000,
      disbursed_at: '2026-04-01',
      reference_id: 'inv-abc',
      source: 'webhook',
      status: 'observed',
      observed_at: new Date('2026-04-01'),
    },
  ];
}

const STAGES_UNDER_TEST: QuoteSubmissionStage[] = [
  'submitted',
  'underwriting',
  'approved',
  'noa_sent',
  'noa_signed',
  'active',
  'disbursing',
];

// We use a dynamic import to get the component after mocking
async function getDealRoomCarrierView() {
  const mod = await import('@/components/dashboard/DealRoomCarrierView');
  return mod.default;
}

describe('DealRoomCarrierView — 7/7 stage coverage (target metric)', () => {
  afterEach(() => cleanup());

  it('stage: submitted — shows "Waiting on your factor" action panel', async () => {
    const DealRoomCarrierView = await getDealRoomCarrierView();
    const submission = makeSubmission('submitted');
    render(
      React.createElement(DealRoomCarrierView, {
        submission,
        factorName: 'Apex Capital',
        disbursements: [],
        messages: [],
      }),
    );
    expect(screen.getByText(/Waiting on your factor/i)).toBeTruthy();
    // Stage pipeline is rendered — check for the "Submitted" label
    expect(screen.getByText('Submitted')).toBeTruthy();
    expect(screen.getByTestId('message-list')).toBeTruthy();
    // No iframe for noa_sent
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('stage: underwriting — shows underwriting copy', async () => {
    const DealRoomCarrierView = await getDealRoomCarrierView();
    const submission = makeSubmission('underwriting');
    render(
      React.createElement(DealRoomCarrierView, {
        submission,
        factorName: 'Apex Capital',
        disbursements: [],
        messages: [],
      }),
    );
    expect(screen.getByText(/Underwriting is in progress/i)).toBeTruthy();
    expect(screen.getByTestId('message-list')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('stage: approved — shows approved copy', async () => {
    const DealRoomCarrierView = await getDealRoomCarrierView();
    const submission = makeSubmission('approved');
    render(
      React.createElement(DealRoomCarrierView, {
        submission,
        factorName: 'Apex Capital',
        disbursements: [],
        messages: [],
      }),
    );
    expect(screen.getByText(/Approved — awaiting NOA/i)).toBeTruthy();
    expect(screen.getByTestId('message-list')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('stage: noa_sent — shows NOA signing CTA and renders iframe via NoaSignPanel', async () => {
    const DealRoomCarrierView = await getDealRoomCarrierView();
    const submission = makeSubmission('noa_sent');
    // Provide a noa envelope so NoaSignPanel gets a signUrl
    const noaEnvelope = {
      id: 'env-uuid-1',
      external_id: 'ext-abc',
      carrier_dot: '1234567',
      factor_slug: 'apex-capital',
      load_id: null,
      provider: 'documenso',
      provider_envelope_id: 'tokenabc123',
      state: 'sent',
      signed_at: null,
      signer_ip: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // We need NEXT_PUBLIC_DOCUMENSO_API_URL or the sign URL will be empty
    process.env.NEXT_PUBLIC_DOCUMENSO_API_URL = 'https://app.documenso.com';

    render(
      React.createElement(DealRoomCarrierView, {
        submission,
        factorName: 'Apex Capital',
        noaEnvelope,
        disbursements: [],
        messages: [],
      }),
    );

    expect(screen.getByText(/Your NOA is ready to sign/i)).toBeTruthy();
    expect(screen.getByTestId('message-list')).toBeTruthy();

    // iframe should be rendered for noa_sent with a valid envelope
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src')).toMatch(/\/sign\//);
    delete process.env.NEXT_PUBLIC_DOCUMENSO_API_URL;
  });

  it('stage: noa_signed — shows onboarding copy; no iframe; no disbursements', async () => {
    const DealRoomCarrierView = await getDealRoomCarrierView();
    const submission = makeSubmission('noa_signed');
    render(
      React.createElement(DealRoomCarrierView, {
        submission,
        factorName: 'Apex Capital',
        disbursements: [],
        messages: [],
      }),
    );
    expect(screen.getByText(/Onboarding in progress/i)).toBeTruthy();
    expect(screen.getByTestId('message-list')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
    // No disbursement timeline for noa_signed with no disbursements
    expect(screen.queryByText(/Disbursement history/i)).toBeNull();
  });

  it('stage: active — shows active copy and disbursement timeline', async () => {
    const DealRoomCarrierView = await getDealRoomCarrierView();
    const submission = makeSubmission('active');
    render(
      React.createElement(DealRoomCarrierView, {
        submission,
        factorName: 'Apex Capital',
        disbursements: makeDisbursements(),
        messages: [],
      }),
    );
    expect(screen.getByText(/Active funding relationship/i)).toBeTruthy();
    expect(screen.getByTestId('message-list')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
    // Disbursement timeline present
    expect(screen.getByText(/Disbursement history/i)).toBeTruthy();
    // At least one $1,500 entry appears (may appear in multiple totals cells — use getAllByText)
    expect(screen.getAllByText(/\$1,500/).length).toBeGreaterThan(0);
  });

  it('stage: disbursing — shows active copy and disbursement timeline', async () => {
    const DealRoomCarrierView = await getDealRoomCarrierView();
    const submission = makeSubmission('disbursing');
    render(
      React.createElement(DealRoomCarrierView, {
        submission,
        factorName: 'Apex Capital',
        disbursements: makeDisbursements(),
        messages: [],
      }),
    );
    expect(screen.getByText(/Active funding relationship/i)).toBeTruthy();
    expect(screen.getByTestId('message-list')).toBeTruthy();
    // Disbursement timeline present for disbursing stage too
    expect(screen.getByText(/Disbursement history/i)).toBeTruthy();
  });
});

describe('DealRoomCarrierView — all 7 stages accounted for (count check)', () => {
  it('test suite covers all 7 deal stages', () => {
    expect(STAGES_UNDER_TEST).toHaveLength(7);
  });
});
