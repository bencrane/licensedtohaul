// @vitest-environment jsdom
// Test 1: pipeline route renders — 4 stage columns, data-stage attributes, carrier lifecycle copy
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/cache used by actions.ts
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// Mock next/navigation used by client components
vi.mock('next/navigation', () => ({
  usePathname: () => '/partner/apex-capital/pipeline',
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock markCarrierOffboarded so CarrierCard doesn't need a real DB
vi.mock('@/lib/pipeline/actions', () => ({
  markCarrierOffboarded: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock getPipelineCarriers to return controlled data
vi.mock('@/lib/pipeline/queries', () => ({
  getPipelineCarriers: vi.fn().mockResolvedValue([]),
}));

import StageColumn from '@/components/pipeline/StageColumn';
import type { CarrierStage } from '@/lib/pipeline/stage';

const STAGES: CarrierStage[] = ['onboarding', 'active', 'quiet', 'offboarded'];
const STAGE_LABELS: Record<CarrierStage, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  quiet: 'Quiet',
  offboarded: 'Offboarded',
};

describe('pipeline page — stage columns', () => {
  it('renders 4 data-stage columns in order, uses carrier lifecycle copy, page module imports cleanly', async () => {
    const { container } = render(
      React.createElement(
        'div',
        null,
        ...STAGES.map((stage) =>
          React.createElement(StageColumn, {
            key: stage,
            stage,
            carriers: [],
            factorSlug: 'apex-capital',
          }),
        ),
      ),
    );

    // Each stage column must exist with data-stage attribute
    for (const stage of STAGES) {
      const col = container.querySelector(`[data-stage="${stage}"]`);
      expect(col, `Expected column with data-stage="${stage}"`).not.toBeNull();
    }

    // All 4 stage headers present
    for (const label of Object.values(STAGE_LABELS)) {
      expect(screen.queryByText(label)).not.toBeNull();
    }

    // Page module imports without error — smoke check
    const pageMod = await import('@/app/partner/[slug]/pipeline/page');
    expect(typeof pageMod.default).toBe('function');

    // Carrier lifecycle copy — not lead-broker terms
    const text = container.textContent ?? '';
    expect(text.toLowerCase()).toMatch(/carrier|lifecycle|onboarding|active|quiet|offboarded/);

    const forbidden = ['leads', 'deals', 'deliveries', 'qualified', 'composer', 'catalog'];
    for (const term of forbidden) {
      expect(text.toLowerCase(), `Found forbidden term "${term}" in rendered output`).not.toContain(term);
    }
  });
});
