import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Membership } from '@application/entities/organization/Membership';
import { Forbidden } from '@application/errors/common';
import { MemberNotFound } from '@application/errors/organization';
import type { MembershipRepository } from '@application/repositories/organization/MembershipRepository';

export class RemoveMemberUseCase {
  constructor(
    private readonly membershipsOf: MembershipRepository.ForOrg,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({
    actor,
    accountId,
  }: RemoveMemberUseCase.Input): Promise<void> {
    const memberships = this.membershipsOf(actor.orgId);
    const target = await memberships.find(accountId);

    if (!target) {
      throw new MemberNotFound();
    }

    if (!actor.mayRemove(target)) {
      throw new Forbidden();
    }

    const unit = this.unitOfWork();
    unit.add(
      memberships.heldOperation(actor),
      memberships.removeOperation(target),
    );
    await unit.commit();
  }
}

export namespace RemoveMemberUseCase {
  export interface Input {
    actor: Membership;
    accountId: Account.Id;
  }
}
