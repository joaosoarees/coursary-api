import type { Account } from '@application/entities/account/Account';
import type { Membership } from '@application/entities/organization/Membership';
import type { Organization } from '@application/entities/organization/Organization';
import { NotAMember } from '@application/errors/organization';
import type { MembershipRepository } from '@application/repositories/organization/MembershipRepository';

export class ResolveMembershipUseCase {
  constructor(private readonly membershipsOf: MembershipRepository.ForOrg) {}

  async execute({
    orgId,
    accountId,
  }: ResolveMembershipUseCase.Input): Promise<Membership> {
    const membership = await this.membershipsOf(orgId).find(accountId);

    if (!membership) {
      throw new NotAMember();
    }

    return membership;
  }
}

export namespace ResolveMembershipUseCase {
  export interface Input {
    orgId: Organization.Id;
    accountId: Account.Id;
  }
}
