import type { Membership } from '@application/entities/organization/Membership';
import type { Organization } from '@application/entities/organization/Organization';

export class OrganizationSummary {
  readonly id: Organization.Id;
  readonly name: string;
  readonly role: Membership.Role;
  readonly joinedAt: string;

  constructor(attributes: OrganizationSummary) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.role = attributes.role;
    this.joinedAt = attributes.joinedAt;
  }

  static fromMembership(membership: Membership): OrganizationSummary {
    return new OrganizationSummary({
      id: membership.orgId,
      name: membership.orgName,
      role: membership.role,
      joinedAt: membership.joinedAt.toISOString(),
    });
  }
}
