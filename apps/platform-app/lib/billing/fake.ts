import type { StripeBillingClient, MeterEventInput, MeterEventResult } from './types';

export interface RecordedMeterEvent {
  customer: string;
  event: string;
  value: number;
  timestamp: Date;
  id: string;
}

export class FakeStripeBillingClient implements StripeBillingClient {
  readonly recordedEvents: RecordedMeterEvent[] = [];

  emitMeterEvent(input: MeterEventInput): Promise<MeterEventResult> {
    const id = `fake-evt-${Math.random().toString(36).slice(2)}`;
    const result: MeterEventResult = {
      id,
      customer: input.customer,
      event: input.event,
      value: input.value,
      timestamp: input.timestamp ?? new Date(),
    };
    this.recordedEvents.push({ ...result });
    return Promise.resolve(result);
  }

  /** Test helper: find events matching a partial */
  findEvent(partial: Partial<Pick<RecordedMeterEvent, 'customer' | 'event' | 'value'>>): RecordedMeterEvent | undefined {
    return this.recordedEvents.find((e) =>
      (!partial.customer || e.customer === partial.customer) &&
      (!partial.event || e.event === partial.event) &&
      (partial.value === undefined || e.value === partial.value),
    );
  }
}
