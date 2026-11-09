import { describe, expect, it } from 'vitest';
import { createFakeMailer } from '@/server/adapters/mailer';
import { createFakeEmailQueue, type EmailJob } from '@/server/adapters/queue';
import { createFakeStorage } from '@/server/adapters/storage';
import {
  createFakeStripe,
  StripeSignatureError,
  type CheckoutSessionParams,
} from '@/server/adapters/stripe';

const USER_ID = '54d6406e367b4e8eb85a03ac';
const TOUR_ID = 'feca81d3ccf5abe9838809ad';

const welcome: EmailJob = {
  template: 'Welcome',
  to: 'anjali.menon@example.com',
  firstName: 'Anjali',
  url: 'http://localhost:3000/tours',
};

function checkoutParams(
  overrides: Partial<CheckoutSessionParams> = {},
): CheckoutSessionParams {
  return {
    amountPaise: 1899900,
    currency: 'inr',
    productName: 'Valley of Flowers Trek',
    imageUrls: ['http://localhost:3000/img/tours/valley-of-flowers-cover.jpg'],
    customerEmail: 'anjali.menon@example.com',
    successUrl: 'http://localhost:3000/my-bookings',
    cancelUrl: 'http://localhost:3000/tours/valley-of-flowers-trek',
    metadata: { userId: USER_ID, tourId: TOUR_ID, startDate: '2026-07-18' },
    ...overrides,
  };
}

describe('fake mailer', () => {
  it('[Q7] records each message it is asked to send', async () => {
    const mailer = createFakeMailer();
    const message = {
      to: 'anjali.menon@example.com',
      subject: 'Welcome to Natours',
      html: '<p>Welcome, Anjali.</p>',
      text: 'Welcome, Anjali.',
    };
    await mailer.send(message);
    expect(mailer.sent).toEqual([message]);
  });

  it('[Q7] reset empties the sent list', async () => {
    const mailer = createFakeMailer();
    await mailer.send({
      to: 'a@example.com',
      subject: 's',
      html: 'h',
      text: 't',
    });
    mailer.reset();
    expect(mailer.sent).toHaveLength(0);
  });
});

describe('fake email queue', () => {
  it('[S3] records a job with exactly template, to, firstName and url', async () => {
    const queue = createFakeEmailQueue();
    await queue.enqueue(welcome);
    expect(queue.jobs).toEqual([welcome]);
  });

  it('[S3] rejects a job that carries an extra key and records nothing', async () => {
    const queue = createFakeEmailQueue();
    const smuggled = { ...welcome, passwordHash: 'bcrypt-digest' };
    await expect(queue.enqueue(smuggled as EmailJob)).rejects.toThrow(
      /passwordHash/,
    );
    expect(queue.jobs).toHaveLength(0);
  });

  it('[S3] rejects a job that is missing a key', async () => {
    const queue = createFakeEmailQueue();
    const { url, ...incomplete } = welcome;
    expect(url).toBeTruthy();
    await expect(queue.enqueue(incomplete as EmailJob)).rejects.toThrow(/url/);
    expect(queue.jobs).toHaveLength(0);
  });

  it('[S3] stores a copy, so later changes to the caller object do not alter the job', async () => {
    const queue = createFakeEmailQueue();
    const job = { ...welcome };
    await queue.enqueue(job);
    job.to = 'someone.else@example.com';
    expect(queue.jobs[0]?.to).toBe('anjali.menon@example.com');
  });

  it('[Q7] reset empties the jobs', async () => {
    const queue = createFakeEmailQueue();
    await queue.enqueue(welcome);
    queue.reset();
    expect(queue.jobs).toHaveLength(0);
  });
});

describe('fake storage', () => {
  it('[Q7] put keeps a copy of the bytes and the content type', async () => {
    const storage = createFakeStorage();
    const body = Buffer.from([1, 2, 3]);
    await storage.put('users/anjali.jpg', body, 'image/jpeg');
    body[0] = 9;
    const stored = storage.files.get('users/anjali.jpg');
    expect(stored?.contentType).toBe('image/jpeg');
    expect([...(stored?.body ?? [])]).toEqual([1, 2, 3]);
  });

  it('[Q7] urlFor gives an absolute URL on the APP_URL origin', () => {
    const storage = createFakeStorage();
    expect(storage.urlFor('users/anjali.jpg')).toBe(
      'http://localhost:3000/storage/users%2Fanjali.jpg',
    );
  });

  it('[Q7] delete removes the file and reset empties everything', async () => {
    const storage = createFakeStorage();
    await storage.put('a.jpg', Buffer.from('a'), 'image/jpeg');
    await storage.put('b.jpg', Buffer.from('b'), 'image/jpeg');
    await storage.delete('a.jpg');
    expect([...storage.files.keys()]).toEqual(['b.jpg']);
    storage.reset();
    expect(storage.files.size).toBe(0);
  });
});

describe('fake Stripe', () => {
  it('[S17] records a rupee checkout session and returns a hosted-page URL', async () => {
    const stripe = createFakeStripe();
    const params = checkoutParams();
    const session = await stripe.createCheckoutSession(params);
    expect(stripe.sessions).toEqual([params]);
    expect(session.id.length > 0).toBe(true);
    expect(session.url.startsWith('https://checkout.stripe.com/')).toBe(true);
  });

  it('[S17] gives each session its own id', async () => {
    const stripe = createFakeStripe();
    const first = await stripe.createCheckoutSession(checkoutParams());
    const second = await stripe.createCheckoutSession(checkoutParams());
    expect(first.id === second.id).toBe(false);
  });

  it('[S17] refuses an amount that is not a whole number of paise', async () => {
    const stripe = createFakeStripe();
    await expect(
      stripe.createCheckoutSession(checkoutParams({ amountPaise: 18999.5 })),
    ).rejects.toThrow(/paise/);
    expect(stripe.sessions).toHaveLength(0);
  });

  it('[S17] refuses a currency other than inr', async () => {
    const stripe = createFakeStripe();
    const usd = checkoutParams({ currency: 'usd' as 'inr' });
    await expect(stripe.createCheckoutSession(usd)).rejects.toThrow(/inr/);
    expect(stripe.sessions).toHaveLength(0);
  });

  it('[B9] constructEvent returns the parsed event for a valid signature', () => {
    const stripe = createFakeStripe();
    const raw = JSON.stringify({
      id: 'evt_fake_0001',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_fake_0001' } },
    });
    const event = stripe.constructEvent(raw, stripe.signatureFor(raw));
    expect(event.type).toBe('checkout.session.completed');
    expect(event.id).toBe('evt_fake_0001');
  });

  it('[B9] constructEvent throws StripeSignatureVerificationError for a wrong signature', () => {
    const stripe = createFakeStripe();
    const raw = '{"id":"evt_fake_0001","type":"x","data":{"object":{}}}';
    let caught: unknown;
    try {
      stripe.constructEvent(raw, 'not-the-signature');
    } catch (error) {
      caught = error;
    }
    expect(caught instanceof StripeSignatureError).toBe(true);
    expect((caught as StripeSignatureError).type).toBe(
      'StripeSignatureVerificationError',
    );
  });

  it('[B9] constructEvent throws when the signature is missing', () => {
    const stripe = createFakeStripe();
    const raw = '{"id":"evt_fake_0001","type":"x","data":{"object":{}}}';
    expect(() => stripe.constructEvent(raw, null)).toThrow(
      StripeSignatureError,
    );
  });

  it('[B9] a signature made for one body does not verify another body', () => {
    const stripe = createFakeStripe();
    const signed = '{"id":"evt_fake_0001","type":"x","data":{"object":{}}}';
    const tampered = '{"id":"evt_fake_0002","type":"x","data":{"object":{}}}';
    expect(() =>
      stripe.constructEvent(tampered, stripe.signatureFor(signed)),
    ).toThrow(StripeSignatureError);
  });

  it('[Q7] reset empties the recorded sessions', async () => {
    const stripe = createFakeStripe();
    await stripe.createCheckoutSession(checkoutParams());
    stripe.reset();
    expect(stripe.sessions).toHaveLength(0);
  });
});
