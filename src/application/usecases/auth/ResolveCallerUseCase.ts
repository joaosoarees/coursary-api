import { Account } from '@application/entities/account/Account';
import { InvalidSession } from '@application/errors/auth';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class ResolveCallerUseCase {
  constructor(private readonly accountsRepository: AccountRepository) {}

  async execute({
    accountId,
    accessJti,
  }: ResolveCallerUseCase.Input): Promise<Account> {
    const account = Account.isId(accountId)
      ? await this.accountsRepository.findById(accountId, { consistent: true })
      : null;

    if (!account) {
      throw new InvalidSession();
    }

    const activeAccount = Account.requireActive(account);

    if (activeAccount.session?.accessJti !== accessJti) {
      throw new InvalidSession();
    }

    return activeAccount;
  }
}

export namespace ResolveCallerUseCase {
  export interface Input {
    accountId: string;
    accessJti: string;
  }
}
