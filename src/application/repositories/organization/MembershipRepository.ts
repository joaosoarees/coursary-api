import type { Account } from '@application/entities/account/Account';
import type { Membership } from '@application/entities/organization/Membership';
import type { Organization } from '@application/entities/organization/Organization';

// Bound to one organization when built: no method takes it, so no caller can pass another.
export interface MembershipRepository {
  find: (accountId: Account.Id) => Promise<Membership | null>;
}

export namespace MembershipRepository {
  export type ForOrg = (orgId: Organization.Id) => MembershipRepository;
}
