import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { AccountSummary } from '@application/queries/admin/AccountSummary';
import type { ListAccountsByRoleQuery } from '@application/queries/admin/ListAccountsByRoleQuery';

export class ListAccountsUseCase {
  constructor(private readonly listAccountsByRole: ListAccountsByRoleQuery) {}

  execute({
    role,
    status,
    limit,
    cursor,
  }: ListAccountsUseCase.Input): Promise<Page<AccountSummary>> {
    return this.listAccountsByRole.execute({
      role,
      status,
      page: { limit, cursor },
    });
  }
}

export namespace ListAccountsUseCase {
  export interface Input extends Page.Options {
    role: Account.Role;
    status?: Account.Status;
  }
}
