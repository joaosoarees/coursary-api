import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { expiredSignUpOf } from '@infra/database/dynamo/stream/expiredSignUps';

const accountId = anAccountId();
const ttl = { type: 'Service', principalId: 'dynamodb.amazonaws.com' };

const removal = (
  oldImage: Record<string, unknown>,
  userIdentity: unknown = ttl,
): DynamoDBRecord =>
  ({
    eventName: 'REMOVE',
    userIdentity,
    dynamodb: { OldImage: marshall(oldImage) },
  }) as DynamoDBRecord;

const account = (status: string) => ({
  type: 'Account',
  id: accountId,
  email: 'ana@example.com',
  status,
});

describe('expiredSignUpOf', () => {
  it('should take a pending account the TTL removed', () => {
    expect(expiredSignUpOf(removal(account('PENDING')))).toEqual({
      accountId,
      email: 'ana@example.com',
    });
  });

  it.each([
    ['a removal made by the code', removal(account('PENDING'), null)],
    ['an active account', removal(account('ACTIVE'))],
    [
      'the e-mail claim that expires with it',
      removal({ type: 'EmailClaim', accountId }),
    ],
    [
      'another service',
      removal(account('PENDING'), { type: 'Service', principalId: 'other' }),
    ],
  ])('should pass over %s', (_, record) => {
    expect(expiredSignUpOf(record)).toBeNull();
  });
});
