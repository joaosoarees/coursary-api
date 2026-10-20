import { Account } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class RefreshTokensUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
  ) {}

  async execute({
    refreshToken,
  }: RefreshTokensUseCase.Input): Promise<AuthGateway.Tokens> {
    const { tokens, accountId, accessJti } =
      await this.authGateway.refreshTokens(refreshToken);
    const session = {
      accessJti,
      refreshTokenHash: Account.hashRefreshToken(tokens.refreshToken),
    };

    await this.accountsRepository.rotateSession(
      accountId,
      Account.hashRefreshToken(refreshToken),
      session,
    );

    return tokens;
  }
}

export namespace RefreshTokensUseCase {
  export interface Input {
    refreshToken: string;
  }
}
