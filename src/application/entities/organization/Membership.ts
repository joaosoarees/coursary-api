import type { Account } from '@application/entities/account/Account';
import type { Organization } from '@application/entities/organization/Organization';

// An account inside one organization, with the role it has there. The platform role stays on
// the Account.
export class Membership {
  readonly orgId: Organization.Id;
  readonly accountId: Account.Id;
  readonly orgName: string;
  role: Membership.Role;
  readonly joinedAt: Date;

  constructor(attributes: Membership.Attributes) {
    this.orgId = attributes.orgId;
    this.accountId = attributes.accountId;
    this.orgName = attributes.orgName;
    this.role = attributes.role;
    this.joinedAt = attributes.joinedAt;
  }

  mayChangeRoleOf(target: Membership): boolean {
    return this.role === 'OWNER' && target.role !== 'OWNER';
  }

  mayRemove(target: Membership): boolean {
    if (target.role === 'OWNER') {
      return false;
    }

    return (
      this.role === 'OWNER' ||
      (this.role === 'ADMIN' && target.role === 'MEMBER')
    );
  }

  static ownerOf(organization: Organization): Membership {
    return new Membership({
      orgId: organization.id,
      accountId: organization.ownerId,
      orgName: organization.name,
      role: 'OWNER',
      joinedAt: organization.createdAt,
    });
  }
}

export namespace Membership {
  export const roles = ['OWNER', 'ADMIN', 'MEMBER'] as const;

  export type Role = (typeof roles)[number];

  // The roles a member can be given: there is one owner, the one who created the organization.
  export const grantableRoles = ['ADMIN', 'MEMBER'] as const;

  export interface Attributes {
    orgId: Organization.Id;
    accountId: Account.Id;
    orgName: string;
    role: Role;
    joinedAt: Date;
  }
}
