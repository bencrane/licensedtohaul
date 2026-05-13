import type { FactorOfRecordRow } from '@/lib/factor-of-record/types';
import { getActiveFactorOfRecord } from '@/lib/factor-of-record/queries';

interface FactorOfRecordSectionProps {
  carrierDot: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date);
}

export async function FactorOfRecordSection({ carrierDot }: FactorOfRecordSectionProps) {
  const activeFor: FactorOfRecordRow | null = await getActiveFactorOfRecord(carrierDot);

  if (!activeFor) {
    return (
      <section aria-label="Factor of Record">
        <p>No active factor of record.</p>
        <a href="/factors" data-action="change-factor">
          Set factor
        </a>
      </section>
    );
  }

  const since = formatDate(new Date(activeFor.assigned_at));

  return (
    <section aria-label="Factor of Record">
      <h2>{activeFor.factor_display_name}</h2>
      <p>
        Active factor of record since {since}
      </p>
      <a href="/factors" data-action="change-factor">
        Change factor
      </a>
    </section>
  );
}
