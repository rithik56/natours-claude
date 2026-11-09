import 'server-only';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export type FakeMailer = Mailer & { sent: MailMessage[]; reset(): void };

export function createFakeMailer(): FakeMailer {
  return { sent: [], send: async () => {}, reset: () => {} };
}
