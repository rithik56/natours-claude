import 'server-only';
import type { IstDay } from '@/lib/ist';

export type CheckoutSessionParams = {
  amountPaise: number;
  currency: 'inr';
  productName: string;
  imageUrls: string[];
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: { userId: string; tourId: string; startDate: IstDay };
};

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: unknown };
};

export interface StripeClient {
  createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<{ id: string; url: string }>;
  constructEvent(rawBody: string, signature: string | null): StripeEvent;
}

export class StripeSignatureError extends Error {
  readonly type = 'StripeSignatureVerificationError';
}

export type FakeStripe = StripeClient & {
  sessions: CheckoutSessionParams[];
  signatureFor(rawBody: string): string;
  reset(): void;
};

export function createFakeStripe(): FakeStripe {
  return {
    sessions: [],
    createCheckoutSession: async () => ({ id: '', url: '' }),
    constructEvent: () => ({ id: '', type: '', data: { object: null } }),
    signatureFor: () => '',
    reset: () => {},
  };
}
