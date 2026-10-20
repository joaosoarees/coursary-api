import { Account } from '@application/entities/account/Account';
import { AuthUserExists, EmailInUse } from '@application/errors/auth';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import { Saga } from '@shared/saga/Saga';

export class SignUpUseCase {
  constructor(
    private readonly accountsRepository: AccountRepository,
    private readonly authGateway: AuthGateway,
  ) {}

  async execute({
    name,
    email,
    password,
  }: SignUpUseCase.Input): Promise<SignUpUseCase.Output> {
    const account = Account.create({ name, email });
    const saga = new Saga({ accountId: account.id });

    return saga.run(async () => {
      await this.accountsRepository.create(account);
      saga.addCompensation('deleteAccount', () =>
        this.accountsRepository.delete(account),
      );

      const { externalId } = await this.signUpInAuth(account, password);
      saga.addCompensation('deleteAuthUser', async () => {
        await this.authGateway.deleteUnconfirmedUser(account.email);
      });

      account.externalId = externalId;
      await this.accountsRepository.saveExternalId(account);

      return { accountId: account.id };
    });
  }

  private async signUpInAuth(
    account: Account,
    password: string,
  ): Promise<AuthGateway.SignUpResult> {
    const params = {
      email: account.email,
      password,
      internalId: account.id,
    };

    try {
      return await this.authGateway.signUp(params);
    } catch (error) {
      if (!(error instanceof AuthUserExists)) {
        throw error;
      }

      const orphan = await this.authGateway.deleteUnconfirmedUser(
        account.email,
      );

      if (orphan === 'confirmed') {
        console.error(
          JSON.stringify({
            event: 'ConfirmedUserWithoutClaim',
            accountId: account.id,
          }),
        );
        throw new EmailInUse();
      }

      try {
        return await this.authGateway.signUp(params);
      } catch (retryError) {
        if (retryError instanceof AuthUserExists) {
          throw new EmailInUse();
        }

        throw retryError;
      }
    }
  }
}

export namespace SignUpUseCase {
  export interface Input {
    name: string;
    email: string;
    password: string;
  }

  export interface Output {
    accountId: string;
  }
}
