import type { Page } from '@application/contracts/Page';
import type { Membership } from '@application/entities/organization/Membership';
import type { ListMembersQuery } from '@application/queries/organization/ListMembersQuery';
import type { MemberSummary } from '@application/queries/organization/MemberSummary';

export class ListMembersUseCase {
  constructor(private readonly listMembers: ListMembersQuery) {}

  execute({
    actor,
    limit,
    cursor,
  }: ListMembersUseCase.Input): Promise<Page<MemberSummary>> {
    return this.listMembers.execute({
      orgId: actor.orgId,
      page: { limit, cursor },
    });
  }
}

export namespace ListMembersUseCase {
  export interface Input extends Page.Options {
    actor: Membership;
  }
}
