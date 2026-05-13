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

export interface OnboardFactorBillingInput {
  factorSlug: string;
  email: string;
  platformFeeCents: number; // cents, e.g. 250000 = $2500
  disbursementBps: number;  // e.g. 50
}

export interface OnboardFactorBillingResult {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeMeterId: string;
}
