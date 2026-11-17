import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import type { ListMyOrganizationsQuery } from '@application/queries/organization/ListMyOrganizationsQuery';
import type { OrganizationSummary } from '@application/queries/organization/OrganizationSummary';

export class ListMyOrganizationsUseCase {
  constructor(private readonly listMyOrganizations: ListMyOrganizationsQuery) {}

  execute({
    callerId,
    limit,
    cursor,
  }: ListMyOrganizationsUseCase.Input): Promise<Page<OrganizationSummary>> {
    return this.listMyOrganizations.execute({
      accountId: callerId,
      page: { limit, cursor },
    });
  }
}

export namespace ListMyOrganizationsUseCase {
  export interface Input extends Page.Options {
    callerId: Account.Id;
  }
}
