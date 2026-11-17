import type { Account } from '@application/entities/account/Account';
import { Organization } from '@application/entities/organization/Organization';

export class OrganizationItem {
  static readonly type = 'Organization';

  private readonly keys: OrganizationItem.Keys;

  constructor(private readonly attributes: OrganizationItem.Attributes) {
    this.keys = {
      PK: OrganizationItem.getPK(attributes.id),
      SK: OrganizationItem.getSK(attributes.id),
    };
  }

  toItem(): OrganizationItem.ItemType {
    return { ...this.keys, ...this.attributes, type: OrganizationItem.type };
  }

  static fromEntity(organization: Organization): OrganizationItem {
    return new OrganizationItem({
      id: organization.id,
      name: organization.name,
      ownerId: organization.ownerId,
      createdAt: organization.createdAt.toISOString(),
    });
  }

  static toEntity(item: OrganizationItem.ItemType): Organization {
    return new Organization({
      id: item.id,
      name: item.name,
      ownerId: item.ownerId,
      createdAt: new Date(item.createdAt),
    });
  }

  static getPK(id: Organization.Id): OrganizationItem.Keys['PK'] {
    return `ORG#${id}`;
  }

  static getSK(id: Organization.Id): OrganizationItem.Keys['SK'] {
    return `ORG#${id}`;
  }
}

export namespace OrganizationItem {
  export interface Keys {
    PK: `ORG#${string}`;
    SK: `ORG#${string}`;
  }

  export interface Attributes {
    id: Organization.Id;
    name: string;
    ownerId: Account.Id;
    createdAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'Organization' };
}
