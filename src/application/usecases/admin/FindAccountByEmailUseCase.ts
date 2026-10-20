import { AccountNotFound } from '@application/errors/account';
import { AccountSummary } from '@application/queries/admin/AccountSummary';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class FindAccountByEmailUseCase {
  constructor(private readonly accountsRepository: AccountRepository) {}

  async execute({
    email,
  }: FindAccountByEmailUseCase.Input): Promise<AccountSummary> {
    const account = await this.accountsRepository.findByEmail(email);

    if (!account) {
      throw new AccountNotFound();
    }

    return AccountSummary.fromAccount(account);
  }
}

export namespace FindAccountByEmailUseCase {
  export interface Input {
    email: string;
  }
}
