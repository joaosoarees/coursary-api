import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { MailBusy } from '@application/errors/mail';
import type { MailGateway } from '@application/gateways/mail/MailGateway';
import type { MailTemplates } from '@application/gateways/mail/MailTemplates';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import type { SentMailRepository } from '@application/repositories/mail/SentMailRepository';

// Welcomes an account that was just confirmed, once (Q349, Q350).
export class SendWelcomeEmailUseCase {
  static readonly leaseSeconds = 120;

  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly sentMails: SentMailRepository,
    private readonly mailTemplates: MailTemplates,
    private readonly mailGateway: MailGateway,
  ) {}

  async execute({
    accountId,
  }: SendWelcomeEmailUseCase.Input): Promise<SendWelcomeEmailUseCase.Outcome> {
    const account = await this.accountsRepository.findById(accountId, {
      consistent: true,
    });

    if (account?.status !== accountStatuses.Active) {
      console.warn(JSON.stringify({ event: 'MailSkipped', accountId }));

      return 'skipped';
    }

    const claimed = await this.sentMails.claim({
      accountId,
      kind: 'welcome',
      now: new Date(),
      leaseSeconds: SendWelcomeEmailUseCase.leaseSeconds,
    });

    if (claimed === 'sent') {
      return 'already-sent';
    }

    if (claimed === 'busy') {
      throw new MailBusy();
    }

    const content = await this.mailTemplates.welcome({ name: account.name });
    const { messageId } = await this.mailGateway.send({
      to: account.email,
      ...content,
    });
    await this.sentMails.markSent({
      accountId,
      kind: 'welcome',
      sesMessageId: messageId,
      sentAt: new Date(),
    });

    return 'sent';
  }
}

export namespace SendWelcomeEmailUseCase {
  export interface Input {
    accountId: Account.Id;
  }

  export type Outcome = 'sent' | 'already-sent' | 'skipped';
}
