import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';

describe('AccountItem', () => {
  it('should build the table and index keys of a pending account', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });

    const item = AccountItem.fromEntity(account).toItem();

    expect(item).toMatchObject({
      PK: `ACCOUNT#${account.id}`,
      SK: `ACCOUNT#${account.id}`,
      GSI1PK: 'ROLE#student',
      GSI1SK: `ACCOUNT#${account.id}`,
      GSI2PK: 'EMAIL#ana@example.com',
      GSI2SK: `ACCOUNT#${account.id}`,
      type: 'Account',
    });
  });

  it('should give a pending account an expiry in seconds, three days ahead', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });
    const nowInSeconds = Math.floor(Date.now() / 1000);

    const { expiresAt } = AccountItem.fromEntity(account).toItem();

    expect(expiresAt).toBeGreaterThanOrEqual(nowInSeconds + 3 * 86400);
    expect(expiresAt).toBeLessThan(nowInSeconds + 3 * 86400 + 5);
  });

  it('should not expire an active account', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });
    account.status = 'ACTIVE';

    expect(AccountItem.fromEntity(account).toItem().expiresAt).toBeUndefined();
  });

  it('should read back the same account it wrote', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });
    account.externalId = 'cognito-sub-1';

    expect(
      AccountItem.toEntity(AccountItem.fromEntity(account).toItem()),
    ).toEqual(account);
  });

  it('should keep the session of a signed-in account', () => {
    const account = Account.create({ name: 'Ana', email: 'ana@example.com' });
    account.session = { accessJti: 'jti-1', refreshTokenHash: 'hash-1' };

    const item = AccountItem.fromEntity(account).toItem();

    expect(AccountItem.toEntity(item).session).toEqual({
      accessJti: 'jti-1',
      refreshTokenHash: 'hash-1',
    });
  });
});
