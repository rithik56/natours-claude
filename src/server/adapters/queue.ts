import 'server-only';

export type EmailTemplate = 'Welcome' | 'PasswordReset' | 'BookingConfirmed';

export type EmailJob = {
  template: EmailTemplate;
  to: string;
  firstName: string;
  url: string;
};

export interface EmailQueue {
  enqueue(job: EmailJob): Promise<void>;
}

export type FakeEmailQueue = EmailQueue & { jobs: EmailJob[]; reset(): void };

export function createFakeEmailQueue(): FakeEmailQueue {
  return { jobs: [], enqueue: async () => {}, reset: () => {} };
}
