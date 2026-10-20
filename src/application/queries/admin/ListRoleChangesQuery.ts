import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { RoleChangeSummary } from '@application/queries/admin/RoleChangeSummary';

export interface ListRoleChangesQuery {
  execute: (
    input: ListRoleChangesQuery.Input,
  ) => Promise<Page<RoleChangeSummary>>;
}

export namespace ListRoleChangesQuery {
  export interface Input {
    accountId: Account.Id;
    page: Page.Options;
  }
}
