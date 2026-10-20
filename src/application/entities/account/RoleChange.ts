import KSUID from 'ksuid';

import type { Account } from '@application/entities/account/Account';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export const BOOTSTRAP_ACTOR = 'bootstrap' as const;

export class RoleChange {
  readonly id: RoleChange.Id;
  readonly accountId: Account.Id;
  readonly changedBy: RoleChange.Actor;
  readonly fromRole: Account.Role;
  readonly toRole: Account.Role;
  readonly changedAt: Date;

  constructor(attributes: RoleChange.Attributes) {
    this.id = attributes.id;
    this.accountId = attributes.accountId;
    this.changedBy = attributes.changedBy;
    this.fromRole = attributes.fromRole;
    this.toRole = attributes.toRole;
    this.changedAt = attributes.changedAt;
  }

  static isId(value: unknown): value is RoleChange.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): RoleChange.Id {
    if (!RoleChange.isId(value)) {
      throw new TypeError(`Not a role change id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  static create({
    account,
    toRole,
    changedBy,
  }: {
    account: Account;
    toRole: Account.Role;
    changedBy: RoleChange.Actor;
  }): RoleChange {
    return new RoleChange({
      id: RoleChange.toId(KSUID.randomSync().string),
      accountId: account.id,
      changedBy,
      fromRole: account.role,
      toRole,
      changedAt: new Date(),
    });
  }
}

export namespace RoleChange {
  export type Id = string & { readonly __brand: 'RoleChange.Id' };

  export type Actor = Account.Id | typeof BOOTSTRAP_ACTOR;

  export interface Attributes {
    id: Id;
    accountId: Account.Id;
    changedBy: Actor;
    fromRole: Account.Role;
    toRole: Account.Role;
    changedAt: Date;
  }
}
