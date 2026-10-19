import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { confirmedAccountOf } from '@infra/database/dynamo/stream/confirmedAccounts';

const accountId = anAccountId();
const account = (status: string) => ({
  type: 'Account',
  id: accountId,
  status,
});

const modify = (before: string, after: string): DynamoDBRecord => ({
  eventName: 'MODIFY',
  dynamodb: {
    OldImage: marshall(account(before)) as never,
    NewImage: marshall(account(after)) as never,
  },
});

const insert: DynamoDBRecord = {
  eventName: 'INSERT',
  dynamodb: { NewImage: marshall(account('ACTIVE')) as never },
};

describe('confirmedAccountOf', () => {
  it('should take an account the confirmation turned active', () => {
    expect(confirmedAccountOf(modify('PENDING', 'ACTIVE'))).toBe(accountId);
  });

  it.each([
    ['a re-enabled account', modify('DISABLED', 'ACTIVE')],
    ['an active account renamed', modify('ACTIVE', 'ACTIVE')],
    ['a disabled account', modify('ACTIVE', 'DISABLED')],
    ['a new account', insert],
  ])('should pass over %s', (_, record) => {
    expect(confirmedAccountOf(record)).toBeNull();
  });
});
