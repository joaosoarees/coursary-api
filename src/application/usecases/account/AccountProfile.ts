import type { Account } from '@application/entities/account/Account';

export class AccountProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Account.Role;
  readonly createdAt: string;

  constructor(attributes: AccountProfile) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.email = attributes.email;
    this.role = attributes.role;
    this.createdAt = attributes.createdAt;
  }

  static fromAccount(account: Account): AccountProfile {
    return new AccountProfile({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      createdAt: account.createdAt.toISOString(),
    });
  }
}
