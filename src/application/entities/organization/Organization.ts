import KSUID from 'ksuid';

import type { Account } from '@application/entities/account/Account';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export class Organization {
  readonly id: Organization.Id;
  readonly name: string;
  readonly ownerId: Account.Id;
  readonly createdAt: Date;

  constructor(attributes: Organization.Attributes) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.ownerId = attributes.ownerId;
    this.createdAt = attributes.createdAt;
  }

  static isId(value: unknown): value is Organization.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): Organization.Id {
    if (!Organization.isId(value)) {
      throw new TypeError(`Not an organization id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  static create({ owner, name }: { owner: Account; name: string }) {
    return new Organization({
      id: Organization.toId(KSUID.randomSync().string),
      name: name.trim(),
      ownerId: owner.id,
      createdAt: new Date(),
    });
  }
}

export namespace Organization {
  export type Id = string & { readonly __brand: 'Organization.Id' };

  export interface Attributes {
    id: Id;
    name: string;
    ownerId: Account.Id;
    createdAt: Date;
  }
}
