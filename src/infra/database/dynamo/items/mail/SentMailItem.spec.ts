import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Account } from '@application/entities/account/Account';
import { SentMailItem } from '@infra/database/dynamo/items/mail/SentMailItem';

describe('SentMailItem', () => {
  it('should keep the claim in the account partition, one per kind', () => {
    const accountId = Account.toId(anAccountId());

    const item = new SentMailItem({
      accountId,
      kind: 'welcome',
      status: 'SENDING',
      leaseUntil: 100,
      attempts: 1,
    }).toItem();

    expect(item).toMatchObject({
      PK: `ACCOUNT#${accountId}`,
      SK: 'MAIL#welcome',
      type: 'SentMail',
      status: 'SENDING',
    });
  });
});
