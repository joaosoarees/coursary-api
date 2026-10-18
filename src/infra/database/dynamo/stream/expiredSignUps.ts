import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';

import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';

// Only a removal by TTL carries this identity; one made by the code has none (Q41, Q341).
const removedByTtl = (record: DynamoDBRecord) => {
  const identity = record.userIdentity as
    { type?: string; principalId?: string } | undefined;

  return (
    record.eventName === 'REMOVE' &&
    identity?.type === 'Service' &&
    identity.principalId === 'dynamodb.amazonaws.com'
  );
};

// The account a sign-up that expired unconfirmed leaves behind, or null.
export function expiredSignUpOf(
  record: DynamoDBRecord,
): AuthGateway.ExpiredSignUp | null {
  const image = record.dynamodb?.OldImage;

  if (!removedByTtl(record) || !image) {
    return null;
  }

  const account = unmarshall(image as Record<string, AttributeValue>);

  if (
    account.type !== AccountItem.type ||
    account.status !== accountStatuses.Pending ||
    !Account.isId(account.id) ||
    typeof account.email !== 'string'
  ) {
    return null;
  }

  return { accountId: account.id, email: account.email };
}
