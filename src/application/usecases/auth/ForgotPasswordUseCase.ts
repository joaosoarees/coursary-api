import { accountStatuses } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class ForgotPasswordUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
  ) {}

  async execute({ email }: ForgotPasswordUseCase.Input): Promise<void> {
    const account = await this.accountsRepository.findByEmail(email);

    if (account?.status !== accountStatuses.Active) {
      console.warn(
        JSON.stringify({
          event: 'ResetCodeNotRequested',
          reason: account?.status ?? 'NO_ACCOUNT',
        }),
      );
      return;
    }

    await this.authGateway.forgotPassword(account.email);
  }
}

export namespace ForgotPasswordUseCase {
  export interface Input {
    email: string;
  }
}
