import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { expiresAtFromNow, PENDING_TTL_DAYS } from '@infra/database/dynamo/ttl';

export class EmailClaimItem {
  static readonly type = 'EmailClaim';

  private readonly keys: EmailClaimItem.Keys;

  constructor(private readonly attributes: EmailClaimItem.Attributes) {
    this.keys = {
      PK: EmailClaimItem.getPK(attributes.email),
      SK: EmailClaimItem.getSK(attributes.email),
    };
  }

  toItem(): EmailClaimItem.ItemType {
    return { ...this.keys, ...this.attributes, type: EmailClaimItem.type };
  }

  static fromEntity(account: Account): EmailClaimItem {
    return new EmailClaimItem({
      email: account.email,
      accountId: account.id,
      ...(account.status === accountStatuses.Pending
        ? { expiresAt: expiresAtFromNow(PENDING_TTL_DAYS) }
        : {}),
    });
  }

  static getPK(email: string): EmailClaimItem.Keys['PK'] {
    return `EMAIL_CLAIM#${email}`;
  }

  static getSK(email: string): EmailClaimItem.Keys['SK'] {
    return `EMAIL_CLAIM#${email}`;
  }
}

export namespace EmailClaimItem {
  export interface Keys {
    PK: `EMAIL_CLAIM#${string}`;
    SK: `EMAIL_CLAIM#${string}`;
  }

  export interface Attributes {
    email: string;
    accountId: Account.Id;
    expiresAt?: number;
  }

  export type ItemType = Keys & Attributes & { type: 'EmailClaim' };
}
