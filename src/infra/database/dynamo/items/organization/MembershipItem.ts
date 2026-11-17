import type { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import type { Organization } from '@application/entities/organization/Organization';
import { OrganizationItem } from '@infra/database/dynamo/items/organization/OrganizationItem';

// In the organization's partition, with the account's organizations in GSI1.
export class MembershipItem {
  static readonly type = 'Membership';

  private readonly keys: MembershipItem.Keys;

  constructor(private readonly attributes: MembershipItem.Attributes) {
    this.keys = {
      PK: MembershipItem.getPK(attributes.orgId),
      SK: MembershipItem.getSK(attributes.accountId),
      GSI1PK: MembershipItem.getGSI1PK(attributes.accountId),
      GSI1SK: MembershipItem.getGSI1SK(attributes.orgId),
    };
  }

  toItem(): MembershipItem.ItemType {
    return { ...this.keys, ...this.attributes, type: MembershipItem.type };
  }

  static fromEntity(membership: Membership): MembershipItem {
    return new MembershipItem({
      orgId: membership.orgId,
      accountId: membership.accountId,
      orgName: membership.orgName,
      role: membership.role,
      joinedAt: membership.joinedAt.toISOString(),
    });
  }

  static toEntity(item: MembershipItem.ItemType): Membership {
    return new Membership({
      orgId: item.orgId,
      accountId: item.accountId,
      orgName: item.orgName,
      role: item.role,
      joinedAt: new Date(item.joinedAt),
    });
  }

  static getPK(orgId: Organization.Id): MembershipItem.Keys['PK'] {
    return OrganizationItem.getPK(orgId);
  }

  static getSK(accountId: Account.Id): MembershipItem.Keys['SK'] {
    return `MEMBER#${accountId}`;
  }

  static getGSI1PK(accountId: Account.Id): MembershipItem.Keys['GSI1PK'] {
    return `MEMBERSHIPS#${accountId}`;
  }

  static getGSI1SK(orgId: Organization.Id): MembershipItem.Keys['GSI1SK'] {
    return `ORG#${orgId}`;
  }
}

export namespace MembershipItem {
  export interface Keys {
    PK: `ORG#${string}`;
    SK: `MEMBER#${string}`;
    GSI1PK: `MEMBERSHIPS#${string}`;
    GSI1SK: `ORG#${string}`;
  }

  export interface Attributes {
    orgId: Organization.Id;
    accountId: Account.Id;
    orgName: string;
    role: Membership.Role;
    joinedAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'Membership' };
}
