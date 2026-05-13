import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('@/lib/factor-of-record/queries', () => ({
  getActiveFactorOfRecord: vi.fn().mockResolvedValue({
    id: 'test-for-id',
    carrier_dot: '1234567',
    factor_slug: 'apex-capital',
    factor_display_name: 'Apex Capital',
    status: 'active',
    assigned_at: new Date('2026-05-13T12:00:00Z'),
    revoked_at: null,
    noa_envelope_id: null,
    created_at: new Date('2026-05-13T12:00:00Z'),
  }),
}));

describe('FactorOfRecordSection', () => {
  it('renders active FoR with correct text and change-factor link', async () => {
    const { FactorOfRecordSection } = await import(
      '@/components/dashboard/FactorOfRecordSection'
    );

    const tree = await FactorOfRecordSection({ carrierDot: '1234567' });
    const html = renderToString(tree);

    expect(html).toContain('Apex Capital');
    expect(html).toContain('Active factor of record since');
    expect(html).toContain('May 13, 2026');
    expect(html).toContain('data-action="change-factor"');
  });
});
