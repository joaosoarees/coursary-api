import type { Account } from '@application/entities/account/Account';

export class AccountSummary {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Account.Role;
  readonly status: Account.Status;
  readonly createdAt: string;

  constructor(attributes: AccountSummary) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.email = attributes.email;
    this.role = attributes.role;
    this.status = attributes.status;
    this.createdAt = attributes.createdAt;
  }

  static fromAccount(account: Account): AccountSummary {
    return new AccountSummary({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
    });
  }
}
