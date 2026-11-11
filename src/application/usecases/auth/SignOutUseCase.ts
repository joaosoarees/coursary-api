import type { Account } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

// The session goes first, which ends the access token at once; then the refresh token, when the
// cookie still has one.
export class SignOutUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
    private readonly realtimeConnections: RealtimeConnections,
  ) {}

  async execute({
    callerId,
    refreshToken,
  }: SignOutUseCase.Input): Promise<void> {
    await this.accountsRepository.clearSession(callerId);
    await this.realtimeConnections.closeForAccount({ accountId: callerId });

    if (refreshToken) {
      await this.authGateway.revokeToken(refreshToken);
    }
  }
}

export namespace SignOutUseCase {
  export interface Input {
    callerId: Account.Id;
    refreshToken: string | null;
  }
}
