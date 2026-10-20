import { Account, accountRoles } from '@application/entities/account/Account';
import {
  BOOTSTRAP_ACTOR,
  RoleChange,
} from '@application/entities/account/RoleChange';
import type { AccountRepository } from '@application/repositories/account/AccountRepository';

export class PromoteFirstAdminUseCase {
  constructor(private readonly accountsRepository: AccountRepository) {}

  async execute({
    email,
  }: PromoteFirstAdminUseCase.Input): Promise<PromoteFirstAdminUseCase.Output> {
    const found = await this.accountsRepository.findByEmail(email);
    const account = Account.requireActive(found);

    if (account.role === accountRoles.Admin) {
      return { accountId: account.id, changed: false };
    }

    const roleChange = RoleChange.create({
      account,
      toRole: accountRoles.Admin,
      changedBy: BOOTSTRAP_ACTOR,
    });

    await this.accountsRepository.changeRole(roleChange);

    return { accountId: account.id, changed: true };
  }
}

export namespace PromoteFirstAdminUseCase {
  export interface Input {
    email: string;
  }

  export interface Output {
    accountId: string;
    changed: boolean;
  }
}
