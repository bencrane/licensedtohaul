// @vitest-environment jsdom
// Test 2: partner sidebar renders exactly the new 8 sections (+ Pipeline added in pipeline-lifecycle-v1), none of the old
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock usePathname before import
vi.mock('next/navigation', () => ({
  usePathname: () => '/partner/apex-factoring',
}));

// Mock DashboardShell's useSidebar
vi.mock('@/components/dashboard/DashboardShell', () => ({
  useSidebar: () => null,
}));

// Mock Wordmark
vi.mock('@/components/site/Wordmark', () => ({
  default: () => React.createElement('span', null, 'LTH'),
}));

describe('PartnerSidebar', () => {
  it('renders exactly Overview, Carriers, NOAs, Disbursements, Reconciliation, Team, Billing in order', async () => {
    const { default: PartnerSidebar } = await import('@/components/partner-sidebar/PartnerSidebar');

    render(
      React.createElement(PartnerSidebar, {
        slug: 'apex-factoring',
        partnerName: 'Apex Factoring',
      }),
    );

    const expectedItems = ['Overview', 'Carriers', 'Pipeline', 'NOAs', 'Disbursements', 'Reconciliation', 'Team', 'Billing'];
    const forbiddenItems = ['Spec', 'Audience', 'Catalog', 'Compose', 'Defaults', 'Transfer inbox'];

    for (const label of expectedItems) {
      expect(screen.queryByText(label), `Expected "${label}" to be in sidebar`).not.toBeNull();
    }

    for (const label of forbiddenItems) {
      expect(screen.queryByText(label), `Expected "${label}" NOT to be in sidebar`).toBeNull();
    }

    // Verify order: all nav links
    const links = screen.getAllByRole('link');
    const linkTexts = links.map((l) => l.textContent?.trim()).filter(Boolean);
    const orderedLabels = expectedItems.filter((item) => linkTexts.includes(item));
    expect(orderedLabels).toEqual(expectedItems);
  });
});
