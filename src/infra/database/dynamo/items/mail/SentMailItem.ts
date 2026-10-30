import type { Account } from '@application/entities/account/Account';
import type { SentMailRepository } from '@application/repositories/mail/SentMailRepository';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';

export class SentMailItem {
  static readonly type = 'SentMail';

  private readonly keys: SentMailItem.Keys;

  constructor(private readonly attributes: SentMailItem.Attributes) {
    this.keys = {
      PK: SentMailItem.getPK(attributes.accountId),
      SK: SentMailItem.getSK(attributes.kind, attributes.ref),
    };
  }

  toItem(): SentMailItem.ItemType {
    return { ...this.keys, ...this.attributes, type: SentMailItem.type };
  }

  static getPK(accountId: Account.Id): SentMailItem.Keys['PK'] {
    return AccountItem.getPK(accountId);
  }

  static getSK(kind: SentMailItem.Kind, ref?: string): SentMailItem.Keys['SK'] {
    return ref ? `MAIL#${kind}#${ref}` : `MAIL#${kind}`;
  }
}

export namespace SentMailItem {
  export type Kind = SentMailRepository.Kind;

  export interface Keys {
    PK: `ACCOUNT#${string}`;
    SK: `MAIL#${Kind}` | `MAIL#${Kind}#${string}`;
  }

  export interface Attributes {
    accountId: Account.Id;
    kind: Kind;
    ref?: string;
    status: 'SENDING' | 'SENT';
    // Epoch seconds; another attempt may take over a SENDING claim after it.
    leaseUntil?: number;
    attempts: number;
    sesMessageId?: string;
    sentAt?: string;
  }

  export type ItemType = Keys & Attributes & { type: 'SentMail' };
}
