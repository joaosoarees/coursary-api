import {
  type Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { AuthUserNotPending, InvalidCode } from '@application/errors/auth';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class ConfirmSignUpUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
  ) {}

  async execute({ email, code }: ConfirmSignUpUseCase.Input): Promise<void> {
    const account = await this.accountsRepository.findByEmail(email);

    if (account?.status !== accountStatuses.Pending) {
      throw new InvalidCode();
    }

    await this.confirmInAuth(account, code);

    account.activate();
    await this.accountsRepository.activate(account);
  }

  private async confirmInAuth(account: Account, code: string): Promise<void> {
    try {
      await this.authGateway.confirmSignUp(account.email, code);
    } catch (error) {
      if (!(error instanceof AuthUserNotPending)) {
        throw error;
      }

      const confirmed = await this.authGateway.isUserConfirmed(account.email);

      if (!confirmed) {
        throw new InvalidCode();
      }

      console.error(
        JSON.stringify({
          event: 'ConfirmedUserWithPendingAccount',
          accountId: account.id,
        }),
      );
    }
  }
}

export namespace ConfirmSignUpUseCase {
  export interface Input {
    email: string;
    code: string;
  }
}
