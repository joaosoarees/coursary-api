import type { Account } from '@application/entities/account/Account';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';

export class AccountProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Account.Role;
  readonly createdAt: string;
  readonly avatarUrl: Record<string, string> | undefined;

  constructor(attributes: AccountProfile) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.email = attributes.email;
    this.role = attributes.role;
    this.createdAt = attributes.createdAt;
    this.avatarUrl = attributes.avatarUrl;
  }

  static fromAccount(
    account: Account,
    assetUrls: PublicAssetUrls,
  ): AccountProfile {
    return new AccountProfile({
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      createdAt: account.createdAt.toISOString(),
      avatarUrl: assetUrls.urlsOf(account.avatar),
    });
  }
}
