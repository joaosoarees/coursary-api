import { Account } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class SignInUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
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

    return tokens;
  }
}

export namespace SignInUseCase {
  export type Input = AuthGateway.SignInParams;
}
