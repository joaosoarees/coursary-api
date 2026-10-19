import type { Account } from '@application/entities/account/Account';
import { MailBusy } from '@application/errors/mail';
import type { MailGateway } from '@application/gateways/mail/MailGateway';
import type { MailTemplates } from '@application/gateways/mail/MailTemplates';
import type { SentMailRepository } from '@application/repositories/mail/SentMailRepository';

// Sends an e-mail once per account, kind and reference: claim, send, mark (Q350).
export class OnceMailer {
  static readonly leaseSeconds = 120;

  constructor(
    private readonly sentMails: SentMailRepository,
    private readonly mailGateway: MailGateway,
  ) {}

  async send({
    accountId,
    kind,
    ref,
    to,
    compose,
  }: OnceMailer.Mail): Promise<OnceMailer.Outcome> {
    const claimed = await this.sentMails.claim({
      accountId,
      kind,
      ref,
      now: new Date(),
      leaseSeconds: OnceMailer.leaseSeconds,
    });

    if (claimed === 'sent') {
      return 'already-sent';
    }

    // A failed send leaves the claim to lapse, so a later attempt sends it.
    if (claimed === 'busy') {
      throw new MailBusy();
    }

    const content = await compose();
    const { messageId } = await this.mailGateway.send({ to, ...content });
    await this.sentMails.markSent({
      accountId,
      kind,
      ref,
      sesMessageId: messageId,
      sentAt: new Date(),
    });

    return 'sent';
  }
}

export namespace OnceMailer {
  export interface Mail {
    accountId: Account.Id;
    kind: SentMailRepository.Kind;
    ref?: string;
    to: string;
    // Only runs once the claim is held.
    compose: () => Promise<MailTemplates.Content>;
  }

  export type Outcome = 'sent' | 'already-sent';
}
