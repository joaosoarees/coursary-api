import type { Account } from '@application/entities/account/Account';
import type { Membership } from '@application/entities/organization/Membership';

export class MemberSummary {
  readonly accountId: Account.Id;
  readonly name: string;
  readonly email: string;
  readonly role: Membership.Role;
  readonly joinedAt: string;

  constructor(attributes: MemberSummary) {
    this.accountId = attributes.accountId;
    this.name = attributes.name;
    this.email = attributes.email;
    this.role = attributes.role;
    this.joinedAt = attributes.joinedAt;
  }

  static fromMembership(
    membership: Membership,
    account: Account,
  ): MemberSummary {
    return new MemberSummary({
      accountId: membership.accountId,
      name: account.name,
      email: account.email,
      role: membership.role,
      joinedAt: membership.joinedAt.toISOString(),
    });
  }
}
