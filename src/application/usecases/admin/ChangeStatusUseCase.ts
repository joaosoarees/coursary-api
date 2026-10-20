import {
  type Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountNotActive, AccountNotFound } from '@application/errors/account';
import { CannotChangeOwnStatus } from '@application/errors/admin';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class ChangeStatusUseCase {
  constructor(private readonly accountsRepository: AccountRepository) {}

  async execute({
    callerId,
    accountId,
    status,
  }: ChangeStatusUseCase.Input): Promise<ChangeStatusUseCase.Output> {
    if (callerId === accountId) {
      throw new CannotChangeOwnStatus();
    }

    const account = await this.accountsRepository.findById(accountId);

    if (!account) {
      throw new AccountNotFound();
    }

    if (account.status === accountStatuses.Pending) {
      throw new AccountNotActive();
    }

    if (account.status !== status) {
      const statusChange = {
        accountId,
        fromStatus: account.status,
        toStatus: status,
      };

      await this.accountsRepository.changeStatus(statusChange, callerId);
      console.info(
        JSON.stringify({
          event: 'AccountStatusChanged',
          changedBy: callerId,
          ...statusChange,
        }),
      );
    }

    return { id: account.id, status };
  }
}

export namespace ChangeStatusUseCase {
  export type Status =
    typeof accountStatuses.Active | typeof accountStatuses.Disabled;

  export interface Input {
    callerId: Account.Id;
    accountId: Account.Id;
    status: Status;
  }

  export interface Output {
    id: string;
    status: Status;
  }
}
