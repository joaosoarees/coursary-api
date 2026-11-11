import { Account } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class ResetPasswordUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
    private readonly realtimeConnections: RealtimeConnections,
  ) {}

  async execute(params: ResetPasswordUseCase.Input): Promise<void> {
    const email = Account.normalizeEmail(params.email);

    await this.authGateway.resetPassword({ ...params, email });

    try {
      const account = await this.accountsRepository.findByEmail(email);

      if (account) {
        await this.accountsRepository.clearSession(account.id);
        await this.realtimeConnections.closeForAccount({
          accountId: account.id,
        });
      }
    } catch (error) {
      console.error({
        event: 'SessionsNotRevoked',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export namespace ResetPasswordUseCase {
  export type Input = AuthGateway.ResetPasswordParams;
}
