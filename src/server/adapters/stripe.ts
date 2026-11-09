import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
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

/** Carries the type string the real SDK uses; Phase 6 confirms it against the SDK (RESEARCH A2). */
export class StripeSignatureError extends Error {
  readonly type = 'StripeSignatureVerificationError';

  constructor(message = 'The webhook signature does not match the body') {
    super(message);
    this.name = 'StripeSignatureError';
  }
}

export type FakeStripe = StripeClient & {
  sessions: CheckoutSessionParams[];
  signatureFor(rawBody: string): string;
  reset(): void;
};

// Not a real signing key: it only lets tests sign bodies for the fake.
const FAKE_SIGNING_KEY = 'fake-webhook-signing-key-for-tests-only';

export function createFakeStripe(): FakeStripe {
  const sessions: CheckoutSessionParams[] = [];
  let counter = 0;

  function signatureFor(rawBody: string): string {
    return createHmac('sha256', FAKE_SIGNING_KEY).update(rawBody).digest('hex');
  }

  return {
    sessions,
    signatureFor,
    async createCheckoutSession(params) {
      if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
        throw new Error('amountPaise must be a positive whole number of paise');
      }
      if ((params.currency as string) !== 'inr') {
        throw new Error('currency must be inr');
      }
      sessions.push(structuredClone(params));
      counter += 1;
      const id = `cs_fake_${String(counter).padStart(4, '0')}`;
      return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
    },
    constructEvent(rawBody, signature) {
      if (signature === null) throw new StripeSignatureError();
      const given = Buffer.from(signature);
      const wanted = Buffer.from(signatureFor(rawBody));
      if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
        throw new StripeSignatureError();
      }
      return JSON.parse(rawBody) as StripeEvent;
    },
    reset() {
      sessions.length = 0;
      counter = 0;
    },
  };
}
