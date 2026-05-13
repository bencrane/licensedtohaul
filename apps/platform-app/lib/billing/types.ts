export interface MeterEventInput {
  customer: string;
  event: string;
  value: number;
  timestamp?: Date;
  idempotencyKey?: string;
}

export interface MeterEventResult {
  id: string;
  customer: string;
  event: string;
  value: number;
  timestamp: Date;
}

export interface StripeBillingClient {
  emitMeterEvent(input: MeterEventInput): Promise<MeterEventResult>;
}
