import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountUnavailable } from '@application/errors/auth';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class IssueTokenClaimsUseCase {
  constructor(private readonly accountsRepository: AccountRepository) {}

  async execute({
    internalId,
  }: IssueTokenClaimsUseCase.Input): Promise<IssueTokenClaimsUseCase.Output> {
    const account = Account.isId(internalId)
      ? await this.accountsRepository.findById(internalId)
      : null;

    if (account?.status !== accountStatuses.Active) {
      throw new AccountUnavailable();
    }

    return { internalId: account.id, role: account.role };
  }
}

export namespace IssueTokenClaimsUseCase {
  export interface Input {
    internalId: string;
  }

  export interface Output {
    internalId: string;
    role: Account.Role;
  }
}
