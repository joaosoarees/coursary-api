import { accountStatuses } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class ResendConfirmationCodeUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
  ) {}

  async execute({ email }: ResendConfirmationCodeUseCase.Input): Promise<void> {
    const account = await this.accountsRepository.findByEmail(email);

    if (account?.status !== accountStatuses.Pending) {
      return;
    }

    await this.authGateway.resendConfirmationCode(account.email);
  }
}

export namespace ResendConfirmationCodeUseCase {
  export interface Input {
    email: string;
  }
}
