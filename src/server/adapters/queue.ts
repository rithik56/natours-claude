import 'server-only';

export type EmailTemplate = 'Welcome' | 'PasswordReset' | 'BookingConfirmed';

/**
 * Exactly these four keys and nothing else (S3), so a whole user document can
 * never be queued. Phase 6 settles the extra BookingConfirmed props by ADR (SEC-09).
 */
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

const JOB_KEYS = ['template', 'to', 'firstName', 'url'] as const;

function assertExactKeys(job: object): void {
  const keys = Object.keys(job);
  const extra = keys.filter(
    (key) => !(JOB_KEYS as readonly string[]).includes(key),
  );
  const missing = JOB_KEYS.filter((key) => !keys.includes(key));
  if (extra.length > 0) {
    throw new Error(`Email job has unexpected keys: ${extra.join(', ')}`);
  }
  if (missing.length > 0) {
    throw new Error(`Email job is missing keys: ${missing.join(', ')}`);
  }
}

export function createFakeEmailQueue(): FakeEmailQueue {
  const jobs: EmailJob[] = [];
  return {
    jobs,
    async enqueue(job) {
      assertExactKeys(job);
      jobs.push({ ...job });
    },
    reset() {
      jobs.length = 0;
    },
  };
}
