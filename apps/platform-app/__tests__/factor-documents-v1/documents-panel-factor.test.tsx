// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import type { FactorDocumentRow, FactorPartnerConfigRow } from '@/lib/factor-documents/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/dynamic', () => ({
  default: (_fn: unknown, _opts: unknown) => {
    const Stub = ({ token }: { token: string }) =>
      React.createElement('div', { 'data-testid': 'embed-sign-document', 'data-token': token });
    Stub.displayName = 'EmbedSignDocumentStub';
    return Stub;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

function makeDoc(overrides: Partial<FactorDocumentRow> = {}): FactorDocumentRow {
  return {
    id: 'doc-1',
    factor_slug: 'apex-capital',
    carrier_dot: '1234567',
    document_kind: 'noa',
    state: 'sent',
    documenso_document_id: 'envelope_1',
    documenso_template_id: '42',
    carrier_signing_token: 'carrier-tok',
    factor_signing_token: 'factor-tok',
    carrier_signed_at: null,
    factor_signed_at: null,
    completed_at: null,
    voided_at: null,
    void_reason: null,
    notes: null,
    payload: null,
    sent_at: new Date('2026-05-01'),
    updated_at: new Date('2026-05-01'),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<FactorPartnerConfigRow> = {}): FactorPartnerConfigRow {
  return {
    factor_slug: 'apex-capital',
    documenso_noa_template_id: '42',
    documenso_master_agreement_template_id: null,
    documenso_addendum_template_id: null,
    documenso_side_letter_template_id: null,
    updated_at: new Date(),
    ...overrides,
  };
}

async function getDocumentsPanelPartner() {
  const mod = await import('@/components/partner/DocumentsPanel');
  return mod.default;
}

describe('DocumentsPanel (factor/partner view)', () => {
  afterEach(() => cleanup());

  it('renders "Send agreement" button when at least one template ID is configured', async () => {
    const DocumentsPanel = await getDocumentsPanelPartner();
    render(
      React.createElement(DocumentsPanel, {
        factorSlug: 'apex-capital',
        carrierDot: '1234567',
        carrierEmail: 'carrier@test.com',
        documents: [],
        partnerConfig: makeConfig(),
      }),
    );
    const btn = screen.getByText(/Send agreement/i);
    expect(btn).toBeTruthy();
    // Button should not be disabled when config has template IDs
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('renders "Send agreement" button disabled when no templates configured', async () => {
    const DocumentsPanel = await getDocumentsPanelPartner();
    render(
      React.createElement(DocumentsPanel, {
        factorSlug: 'apex-capital',
        carrierDot: '1234567',
        carrierEmail: 'carrier@test.com',
        documents: [],
        partnerConfig: makeConfig({
          documenso_noa_template_id: null, // no templates
        }),
      }),
    );
    const btn = screen.getByText(/Send agreement/i).closest('button');
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders "Send agreement" button disabled when partnerConfig is null', async () => {
    const DocumentsPanel = await getDocumentsPanelPartner();
    render(
      React.createElement(DocumentsPanel, {
        factorSlug: 'apex-capital',
        carrierDot: '1234567',
        carrierEmail: 'carrier@test.com',
        documents: [],
        partnerConfig: null,
      }),
    );
    const btn = screen.getByText(/Send agreement/i).closest('button');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows "Configure in Settings" hint when no templates configured and no docs', async () => {
    const DocumentsPanel = await getDocumentsPanelPartner();
    render(
      React.createElement(DocumentsPanel, {
        factorSlug: 'apex-capital',
        carrierDot: '1234567',
        carrierEmail: 'carrier@test.com',
        documents: [],
        partnerConfig: makeConfig({ documenso_noa_template_id: null }),
      }),
    );
    expect(screen.getByText(/Configure/i)).toBeTruthy();
  });

  it('renders sent documents with state chips', async () => {
    const DocumentsPanel = await getDocumentsPanelPartner();
    render(
      React.createElement(DocumentsPanel, {
        factorSlug: 'apex-capital',
        carrierDot: '1234567',
        carrierEmail: 'carrier@test.com',
        documents: [
          makeDoc({ id: 'doc-1', document_kind: 'noa', state: 'sent' }),
          makeDoc({ id: 'doc-2', document_kind: 'master_agreement', state: 'completed', completed_at: new Date() }),
        ],
        partnerConfig: makeConfig(),
      }),
    );
    // Both doc kind labels appear (use getAllByText for "Notice of Assignment" since it may appear multiple times in the dropdown and the list)
    expect(screen.getAllByText(/Notice of Assignment/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Master Factoring Agreement/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pending carrier/i)).toBeTruthy();
    expect(screen.getByText(/Completed/i)).toBeTruthy();
  });

  it('shows Countersign button for signed_by_carrier doc with factor token', async () => {
    const DocumentsPanel = await getDocumentsPanelPartner();
    render(
      React.createElement(DocumentsPanel, {
        factorSlug: 'apex-capital',
        carrierDot: '1234567',
        carrierEmail: 'carrier@test.com',
        documents: [makeDoc({ state: 'signed_by_carrier', factor_signing_token: 'f-tok' })],
        partnerConfig: makeConfig(),
      }),
    );
    // Use getAllByText since "Countersign" may appear in button text and chip
    const countersignEls = screen.getAllByText(/Countersign/i);
    expect(countersignEls.length).toBeGreaterThan(0);
  });
});
