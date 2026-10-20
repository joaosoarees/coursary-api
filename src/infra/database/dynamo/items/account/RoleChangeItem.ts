import type { Account } from '@application/entities/account/Account';
import { RoleChange } from '@application/entities/account/RoleChange';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';

export class RoleChangeItem {
  static readonly type = 'RoleChange';

  private readonly keys: RoleChangeItem.Keys;

  constructor(private readonly attributes: RoleChangeItem.Attributes) {
    this.keys = {
      PK: RoleChangeItem.getPK(attributes.accountId),
      SK: RoleChangeItem.getSK(attributes.id),
    };
  }

  toItem(): RoleChangeItem.ItemType {
    return { ...this.keys, ...this.attributes, type: RoleChangeItem.type };
  }

  static fromEntity(roleChange: RoleChange): RoleChangeItem {
    return new RoleChangeItem({
      id: roleChange.id,
      accountId: roleChange.accountId,
      changedBy: roleChange.changedBy,
      fromRole: roleChange.fromRole,
      toRole: roleChange.toRole,
      changedAt: roleChange.changedAt.toISOString(),
    });
  }

  static toEntity(item: RoleChangeItem.ItemType): RoleChange {
    return new RoleChange({
      id: item.id,
      accountId: item.accountId,
      changedBy: item.changedBy,
      fromRole: item.fromRole,
      toRole: item.toRole,
      changedAt: new Date(item.changedAt),
    });
  }

  static getPK(accountId: Account.Id): RoleChangeItem.Keys['PK'] {
    return AccountItem.getPK(accountId);
  }

  static getSK(id: RoleChange.Id): RoleChangeItem.Keys['SK'] {
    return `ROLE_CHANGE#${id}`;
  }
}

export namespace RoleChangeItem {
  export interface Keys {
    PK: `ACCOUNT#${string}`;
    SK: `ROLE_CHANGE#${string}`;
  }

  export interface Attributes {
    id: RoleChange.Id;
    accountId: Account.Id;
    changedBy: RoleChange.Actor;
    fromRole: Account.Role;
    toRole: Account.Role;
    changedAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'RoleChange' };
}
