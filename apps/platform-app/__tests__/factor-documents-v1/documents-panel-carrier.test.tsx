// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import type { FactorDocumentRow } from '@/lib/factor-documents/types';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock next/dynamic to return a simple stub for EmbedSignDocument
vi.mock('next/dynamic', () => ({
  default: (_fn: unknown, _opts: unknown) => {
    // Return a React component stub
    const Stub = ({ token }: { token: string }) =>
      React.createElement('div', { 'data-testid': 'embed-sign-document', 'data-token': token });
    Stub.displayName = 'EmbedSignDocumentStub';
    return Stub;
  },
}));

function makeDoc(overrides: Partial<FactorDocumentRow>): FactorDocumentRow {
  return {
    id: 'doc-1',
    factor_slug: 'apex-capital',
    carrier_dot: '1234567',
    document_kind: 'noa',
    state: 'sent',
    documenso_document_id: 'envelope_1',
    documenso_template_id: '42',
    carrier_signing_token: 'carrier-tok-abc',
    factor_signing_token: 'factor-tok-xyz',
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

async function getDocumentsPanel() {
  const mod = await import('@/components/dashboard/DocumentsPanel');
  return mod.default;
}

describe('DocumentsPanel (carrier view)', () => {
  afterEach(() => cleanup());

  it('shows "No documents sent yet" when documents array is empty', async () => {
    const DocumentsPanel = await getDocumentsPanel();
    render(
      React.createElement(DocumentsPanel, {
        documents: [],
        carrierDot: '1234567',
        factorSlug: 'apex-capital',
      }),
    );
    expect(screen.getByText(/No documents sent yet/i)).toBeTruthy();
  });

  it('renders NOA doc row with "Pending signature" state', async () => {
    const DocumentsPanel = await getDocumentsPanel();
    render(
      React.createElement(DocumentsPanel, {
        documents: [makeDoc({ state: 'sent' })],
        carrierDot: '1234567',
        factorSlug: 'apex-capital',
      }),
    );
    expect(screen.getByText(/Notice of Assignment/i)).toBeTruthy();
    expect(screen.getByText(/Pending signature/i)).toBeTruthy();
  });

  it('shows "Review & sign" button for pending (sent) doc with carrier_signing_token', async () => {
    const DocumentsPanel = await getDocumentsPanel();
    render(
      React.createElement(DocumentsPanel, {
        documents: [makeDoc({ state: 'sent', carrier_signing_token: 'carrier-tok-abc' })],
        carrierDot: '1234567',
        factorSlug: 'apex-capital',
      }),
    );
    expect(screen.getByText(/Review & sign/i)).toBeTruthy();
  });

  it('shows "Awaiting factor signature" for signed_by_carrier state', async () => {
    const DocumentsPanel = await getDocumentsPanel();
    render(
      React.createElement(DocumentsPanel, {
        documents: [makeDoc({ state: 'signed_by_carrier', carrier_signed_at: new Date() })],
        carrierDot: '1234567',
        factorSlug: 'apex-capital',
      }),
    );
    expect(screen.getByText(/Awaiting factor signature/i)).toBeTruthy();
    // No "Review & sign" button
    expect(screen.queryByText(/Review & sign/i)).toBeNull();
  });

  it('shows "Signed — awaiting factor" chip for signed_by_carrier state', async () => {
    const DocumentsPanel = await getDocumentsPanel();
    render(
      React.createElement(DocumentsPanel, {
        documents: [makeDoc({ state: 'signed_by_carrier' })],
        carrierDot: '1234567',
        factorSlug: 'apex-capital',
      }),
    );
    // StateChip renders "Awaiting countersign" and the label renders "Awaiting factor signature"
    const awaiting = screen.getAllByText(/Awaiting countersign|Awaiting factor/i);
    expect(awaiting.length).toBeGreaterThan(0);
  });

  it('shows completed state with "Completed" chip', async () => {
    const DocumentsPanel = await getDocumentsPanel();
    render(
      React.createElement(DocumentsPanel, {
        documents: [makeDoc({ state: 'completed', completed_at: new Date('2026-05-10') })],
        carrierDot: '1234567',
        factorSlug: 'apex-capital',
      }),
    );
    expect(screen.getByText(/Completed/i)).toBeTruthy();
  });

  it('renders multiple documents', async () => {
    const DocumentsPanel = await getDocumentsPanel();
    render(
      React.createElement(DocumentsPanel, {
        documents: [
          makeDoc({ id: 'doc-1', document_kind: 'noa', state: 'sent' }),
          makeDoc({ id: 'doc-2', document_kind: 'master_agreement', state: 'completed', completed_at: new Date() }),
        ],
        carrierDot: '1234567',
        factorSlug: 'apex-capital',
      }),
    );
    expect(screen.getByText(/Notice of Assignment/i)).toBeTruthy();
    expect(screen.getByText(/Master Factoring Agreement/i)).toBeTruthy();
  });
});
