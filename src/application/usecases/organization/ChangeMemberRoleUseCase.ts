import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Membership } from '@application/entities/organization/Membership';
import { Forbidden } from '@application/errors/common';
import { MemberNotFound } from '@application/errors/organization';
import type { MembershipRepository } from '@application/repositories/organization/MembershipRepository';

export class ChangeMemberRoleUseCase {
  constructor(
    private readonly membershipsOf: MembershipRepository.ForOrg,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    actor,
    accountId,
    role,
  }: ChangeMemberRoleUseCase.Input): Promise<ChangeMemberRoleUseCase.Result> {
    const memberships = this.membershipsOf(actor.orgId);
    const target = await memberships.find(accountId);

    if (!target) {
      throw new MemberNotFound();
    }

    if (!actor.mayChangeRoleOf(target)) {
      throw new Forbidden();
    }

    if (target.role !== role) {
      const unit = this.unitOfWork();
      unit.add(
        memberships.heldOperation(actor),
        memberships.changeRoleOperation(target, role),
      );
      await unit.commit();
    }

    return { accountId, role };
  }
}

export namespace ChangeMemberRoleUseCase {
  export interface Input {
    actor: Membership;
    accountId: Account.Id;
    role: (typeof Membership.grantableRoles)[number];
  }

  export interface Result {
    accountId: Account.Id;
    role: Membership.Role;
  }
}
