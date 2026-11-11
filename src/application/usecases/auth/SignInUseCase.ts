import { Account } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class SignInUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
    private readonly realtimeConnections: RealtimeConnections,
  ) {}

  async execute({
    email,
    password,
  }: SignInUseCase.Input): Promise<AuthGateway.Tokens> {
    const { tokens, accountId, accessJti } = await this.authGateway.signIn({
      email: Account.normalizeEmail(email),
      password,
    });
    const session = {
      accessJti,
      refreshTokenHash: Account.hashRefreshToken(tokens.refreshToken),
    };

    await this.accountsRepository.saveSession(accountId, session);
    // The session is single: whatever was open under the one just replaced loses its access too.
    await this.realtimeConnections.closeForAccount({ accountId });

    return tokens;
  }
}

export namespace SignInUseCase {
  export type Input = AuthGateway.SignInParams;
}
