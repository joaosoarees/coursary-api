import type { UnitOfWork } from '@application/contracts/UnitOfWork';
import type { Account } from '@application/entities/account/Account';
import type { Membership } from '@application/entities/organization/Membership';
import type { Organization } from '@application/entities/organization/Organization';

// Bound to one organization when built: no method takes it, so no caller can pass another.
export interface MembershipRepository {
  find: (accountId: Account.Id) => Promise<Membership | null>;

  // Holds while the membership still has the role it was read with.
  heldOperation: (membership: Membership) => UnitOfWork.Operation;

  changeRoleOperation: (
    membership: Membership,
    role: Membership.Role,
  ) => UnitOfWork.Operation;

  removeOperation: (membership: Membership) => UnitOfWork.Operation;
}

export namespace MembershipRepository {
  export type ForOrg = (orgId: Organization.Id) => MembershipRepository;
}
