import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { expiresAtFromNow, PENDING_TTL_DAYS } from '@infra/database/dynamo/ttl';

export class AccountItem {
  static readonly type = 'Account';

  private readonly keys: AccountItem.Keys;

  constructor(private readonly attributes: AccountItem.Attributes) {
    this.keys = {
      PK: AccountItem.getPK(attributes.id),
      SK: AccountItem.getSK(attributes.id),
      GSI1PK: AccountItem.getGSI1PK(attributes.role),
      GSI1SK: AccountItem.getGSI1SK(attributes.id),
      GSI2PK: AccountItem.getGSI2PK(attributes.email),
      GSI2SK: AccountItem.getGSI2SK(attributes.id),
    };
  }

  toItem(): AccountItem.ItemType {
    return { ...this.keys, ...this.attributes, type: AccountItem.type };
  }

  static fromEntity(account: Account): AccountItem {
    return new AccountItem({
      id: account.id,
      ...(account.externalId ? { externalId: account.externalId } : {}),
      email: account.email,
      name: account.name,
      role: account.role,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      ...(account.session ? { session: account.session } : {}),
      ...(account.status === accountStatuses.Pending
        ? { expiresAt: expiresAtFromNow(PENDING_TTL_DAYS) }
        : {}),
    });
  }

  static toEntity(item: AccountItem.ItemType): Account {
    return new Account({
      id: item.id,
      externalId: item.externalId,
      email: item.email,
      name: item.name,
      role: item.role,
      status: item.status,
      createdAt: new Date(item.createdAt),
      session: item.session,
    });
  }

  static getPK(id: Account.Id): AccountItem.Keys['PK'] {
    return `ACCOUNT#${id}`;
  }

  static getSK(id: Account.Id): AccountItem.Keys['SK'] {
    return `ACCOUNT#${id}`;
  }

  static getGSI1PK(role: Account.Role): AccountItem.Keys['GSI1PK'] {
    return `ROLE#${role}`;
  }

  static getGSI1SK(id: Account.Id): AccountItem.Keys['GSI1SK'] {
    return `ACCOUNT#${id}`;
  }

  static getGSI2PK(email: string): AccountItem.Keys['GSI2PK'] {
    return `EMAIL#${email}`;
  }

  static getGSI2SK(id: Account.Id): AccountItem.Keys['GSI2SK'] {
    return `ACCOUNT#${id}`;
  }
}

export namespace AccountItem {
  export interface Keys {
    PK: `ACCOUNT#${string}`;
    SK: `ACCOUNT#${string}`;
    GSI1PK: `ROLE#${Account.Role}`;
    GSI1SK: `ACCOUNT#${string}`;
    GSI2PK: `EMAIL#${string}`;
    GSI2SK: `ACCOUNT#${string}`;
  }

  export interface Attributes {
    id: Account.Id;
    externalId?: string;
    email: string;
    name: string;
    role: Account.Role;
    status: Account.Status;
    createdAt: string;
    expiresAt?: number;
    session?: Account.Session;
  }

  export type ItemType = Keys & Attributes & { type: 'Account' };
}
