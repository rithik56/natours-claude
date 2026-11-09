import 'server-only';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Sends one rendered email. Later phases add an SMTP implementation behind this. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export type FakeMailer = Mailer & { sent: MailMessage[]; reset(): void };

export function createFakeMailer(): FakeMailer {
  const sent: MailMessage[] = [];
  return {
    sent,
    async send(message) {
      sent.push({ ...message });
    },
    reset() {
      sent.length = 0;
    },
  };
}
