import { Account } from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';
import type { CleanUpExpiredSignUpUseCase } from '@application/usecases/auth/CleanUpExpiredSignUpUseCase';

export class SweepUnconfirmedUsersUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly accountsRepository: AccountRepository,
    private readonly cleanUpExpiredSignUp: CleanUpExpiredSignUpUseCase,
  ) {}

  async execute(): Promise<SweepUnconfirmedUsersUseCase.Output> {
    const users = await this.authGateway.listUnconfirmedUsers();
    let deleted = 0;

    for (const { email, accountId } of users) {
      if (!Account.isId(accountId)) {
        console.warn(JSON.stringify({ event: 'SweepSkipped', email }));
        continue;
      }

      // An expired account reads as absent, so its user is an orphan already;
      // a strong read so an account written a moment ago is never missed.
      const account = await this.accountsRepository.findById(accountId, {
        consistent: true,
      });

      if (account) {
        continue;
      }

      const outcome = await this.cleanUpExpiredSignUp.execute({
        accountId,
        email,
      });
      deleted += outcome === 'deleted' ? 1 : 0;
    }

    return { unconfirmed: users.length, deleted };
  }
}

export namespace SweepUnconfirmedUsersUseCase {
  export interface Output {
    unconfirmed: number;
    deleted: number;
  }
}
