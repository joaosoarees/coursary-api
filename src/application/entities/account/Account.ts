import { createHash } from 'node:crypto';

import KSUID from 'ksuid';

import { KSUID_PATTERN } from '@application/entities/shared/ksuid';
import { AccountUnavailable } from '@application/errors/auth';

export const accountRoles = {
  Student: 'student',
  Instructor: 'instructor',
  Admin: 'admin',
} as const;

export const accountStatuses = {
  Pending: 'PENDING',
  Active: 'ACTIVE',
  Disabled: 'DISABLED',
} as const;

export class Account {
  readonly id: Account.Id;
  externalId: string | undefined;
  readonly email: string;
  name: string;
  role: Account.Role;
  status: Account.Status;
  readonly createdAt: Date;
  session: Account.Session | undefined;

  constructor(attributes: Account.Attributes) {
    this.id = attributes.id;
    this.externalId = attributes.externalId;
    this.email = Account.normalizeEmail(attributes.email);
    this.name = attributes.name;
    this.role = attributes.role;
    this.status = attributes.status;
    this.createdAt = attributes.createdAt;
    this.session = attributes.session;
  }

  activate(): void {
    this.status = accountStatuses.Active;
  }

  static isId(value: unknown): value is Account.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): Account.Id {
    if (!Account.isId(value)) {
      throw new TypeError(`Not an account id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  static hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static requireActive(account: Account | null): Account {
    if (account?.status !== accountStatuses.Active) {
      throw new AccountUnavailable();
    }

    return account;
  }

  static create({ name, email }: { name: string; email: string }): Account {
    return new Account({
      id: Account.toId(KSUID.randomSync().string),
      externalId: undefined,
      email,
      name: name.trim(),
      role: accountRoles.Student,
      status: accountStatuses.Pending,
      createdAt: new Date(),
      session: undefined,
    });
  }
}

export namespace Account {
  export type Id = string & { readonly __brand: 'Account.Id' };

  export type Role = (typeof accountRoles)[keyof typeof accountRoles];

  export type Status = (typeof accountStatuses)[keyof typeof accountStatuses];

  export interface Attributes {
    id: Id;
    externalId: string | undefined;
    email: string;
    name: string;
    role: Role;
    status: Status;
    createdAt: Date;
    session: Session | undefined;
  }

  export interface Session {
    accessJti: string;
    refreshTokenHash: string;
  }
}
