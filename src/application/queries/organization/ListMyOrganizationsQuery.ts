import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { OrganizationSummary } from '@application/queries/organization/OrganizationSummary';

export interface ListMyOrganizationsQuery {
  execute: (
    input: ListMyOrganizationsQuery.Input,
  ) => Promise<Page<OrganizationSummary>>;
}

export namespace ListMyOrganizationsQuery {
  export interface Input {
    accountId: Account.Id;
    page: Page.Options;
  }
}
