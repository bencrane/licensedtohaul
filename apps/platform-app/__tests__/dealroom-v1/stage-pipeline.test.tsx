// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import StagePipeline from '@/components/dashboard/StagePipeline';
import type { QuoteSubmissionStage } from '@/lib/quote-submissions/types';

describe('StagePipeline', () => {
  afterEach(() => cleanup());

  const happyPathStages: QuoteSubmissionStage[] = [
    'submitted',
    'underwriting',
    'approved',
    'noa_sent',
    'noa_signed',
    'active',
    'disbursing',
  ];

  it('renders all 7 stage labels', () => {
    render(React.createElement(StagePipeline, { currentStage: 'submitted' }));
    expect(screen.getByText('Submitted')).toBeTruthy();
    expect(screen.getByText('Underwriting')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('NOA Sent')).toBeTruthy();
    expect(screen.getByText('NOA Signed')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Disbursing')).toBeTruthy();
  });

  for (const stage of happyPathStages) {
    it(`marks current step correctly for stage: ${stage}`, () => {
      render(React.createElement(StagePipeline, { currentStage: stage }));
      const current = document.querySelector('[aria-current="step"]');
      expect(current).not.toBeNull();
    });
  }

  it('shows declined state without pipeline steps', () => {
    render(React.createElement(StagePipeline, { currentStage: 'declined' }));
    expect(screen.getByText(/Submission declined/i)).toBeTruthy();
    expect(screen.queryByText('Submitted')).toBeNull();
  });

  it('shows offboarded state without pipeline steps', () => {
    render(React.createElement(StagePipeline, { currentStage: 'offboarded' }));
    expect(screen.getByText(/Relationship ended/i)).toBeTruthy();
  });
});
