import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Membership } from '@application/entities/organization/Membership';
import { Forbidden } from '@application/errors/common';
import type { MembershipRepository } from '@application/repositories/organization/MembershipRepository';

export class LeaveOrganizationUseCase {
  constructor(
    private readonly membershipsOf: MembershipRepository.ForOrg,
    private readonly unitOfWork: UnitOfWork.Factory,
  ) {}

  async execute({ membership }: LeaveOrganizationUseCase.Input): Promise<void> {
    // The owner deletes the organization instead: it would be left without one.
    if (membership.role === 'OWNER') {
      throw new Forbidden();
    }

    const unit = this.unitOfWork();
    unit.add(this.membershipsOf(membership.orgId).removeOperation(membership));
    await unit.commit();
  }
}

export namespace LeaveOrganizationUseCase {
  export interface Input {
    membership: Membership;
  }
}
