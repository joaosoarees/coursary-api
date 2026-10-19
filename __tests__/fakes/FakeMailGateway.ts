import type { MailGateway } from '@application/gateways/mail/MailGateway';

export class FakeMailGateway implements MailGateway {
  readonly sent: MailGateway.Mail[] = [];
  failWith: Error | undefined;

  send(mail: MailGateway.Mail): Promise<MailGateway.Sent> {
    if (this.failWith) {
      return Promise.reject(this.failWith);
    }

    this.sent.push(mail);

    return Promise.resolve({ messageId: `ses-${String(this.sent.length)}` });
  }
}
