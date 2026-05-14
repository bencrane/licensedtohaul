// @vitest-environment jsdom
/**
 * DocumentSignPanel renders EmbedSignDocument with correct token prop.
 * @documenso/embed-react is mocked (client-only SSR guard).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock @documenso/embed-react
vi.mock('@documenso/embed-react', () => ({
  EmbedSignDocument: ({
    token,
    onDocumentCompleted,
    onDocumentError,
  }: {
    token: string;
    onDocumentCompleted?: () => void;
    onDocumentError?: () => void;
  }) =>
    React.createElement('div', {
      'data-testid': 'embed-sign-document',
      'data-token': token,
      'data-has-completed': String(typeof onDocumentCompleted === 'function'),
      'data-has-error': String(typeof onDocumentError === 'function'),
    }),
}));

// Mock next/dynamic to directly import the mock above
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ EmbedSignDocument: unknown }>, _opts: unknown) => {
    // Unwrap the lazy import synchronously for test purposes
    const EmbedSignDocumentMock = ({
      token,
      onDocumentCompleted,
      onDocumentError,
    }: {
      token: string;
      onDocumentCompleted?: () => void;
      onDocumentError?: () => void;
    }) =>
      React.createElement('div', {
        'data-testid': 'embed-sign-document',
        'data-token': token,
        'data-has-completed': String(typeof onDocumentCompleted === 'function'),
        'data-has-error': String(typeof onDocumentError === 'function'),
      });
    return EmbedSignDocumentMock;
  },
}));

async function getDocumentSignPanel() {
  const mod = await import('@/components/dashboard/DocumentSignPanel');
  return mod.default;
}

describe('DocumentSignPanel', () => {
  afterEach(() => cleanup());

  it('renders EmbedSignDocument with the correct token prop', async () => {
    const DocumentSignPanel = await getDocumentSignPanel();
    render(
      React.createElement(DocumentSignPanel, {
        documentId: 'doc-uuid-1',
        signingToken: 'carrier-signing-tok-abc123',
      }),
    );

    const embed = screen.getByTestId('embed-sign-document');
    expect(embed).toBeTruthy();
    expect(embed.getAttribute('data-token')).toBe('carrier-signing-tok-abc123');
  });

  it('passes onDocumentCompleted callback to EmbedSignDocument', async () => {
    const DocumentSignPanel = await getDocumentSignPanel();
    render(
      React.createElement(DocumentSignPanel, {
        documentId: 'doc-uuid-2',
        signingToken: 'tok-xyz',
      }),
    );

    const embed = screen.getByTestId('embed-sign-document');
    expect(embed.getAttribute('data-has-completed')).toBe('true');
  });

  it('passes onDocumentError callback to EmbedSignDocument', async () => {
    const DocumentSignPanel = await getDocumentSignPanel();
    render(
      React.createElement(DocumentSignPanel, {
        documentId: 'doc-uuid-3',
        signingToken: 'tok-xyz',
      }),
    );

    const embed = screen.getByTestId('embed-sign-document');
    expect(embed.getAttribute('data-has-error')).toBe('true');
  });

  it('shows fallback message when signingToken is empty', async () => {
    const DocumentSignPanel = await getDocumentSignPanel();
    render(
      React.createElement(DocumentSignPanel, {
        documentId: 'doc-uuid-4',
        signingToken: '',
      }),
    );

    expect(screen.getByText(/Signing link not available/i)).toBeTruthy();
    expect(screen.queryByTestId('embed-sign-document')).toBeNull();
  });
});
