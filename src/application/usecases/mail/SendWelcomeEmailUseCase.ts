import {
  type Account,
  accountStatuses,
} from '@application/entities/account/Account';
import type { MailTemplates } from '@application/gateways/mail/MailTemplates';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import type { OnceMailer } from '@application/usecases/mail/OnceMailer';

// Welcomes an account that was just confirmed, once (Q349, Q350).
export class SendWelcomeEmailUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly mailTemplates: MailTemplates,
    private readonly onceMailer: OnceMailer,
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

    return this.onceMailer.send({
      accountId,
      kind: 'welcome',
      to: account.email,
      compose: () => this.mailTemplates.welcome({ name: account.name }),
    });
  }
}

export namespace SendWelcomeEmailUseCase {
  export interface Input {
    accountId: Account.Id;
  }

  export type Outcome = OnceMailer.Outcome | 'skipped';
}
