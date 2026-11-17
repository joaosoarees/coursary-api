import type { Page } from '@application/contracts/Page';
import type { Organization } from '@application/entities/organization/Organization';
import type { MemberSummary } from '@application/queries/organization/MemberSummary';

export interface ListMembersQuery {
  execute: (input: ListMembersQuery.Input) => Promise<Page<MemberSummary>>;
}

export namespace ListMembersQuery {
  export interface Input {
    // From the membership checked on this request, never from the client.
    orgId: Organization.Id;
    page: Page.Options;
  }
}
