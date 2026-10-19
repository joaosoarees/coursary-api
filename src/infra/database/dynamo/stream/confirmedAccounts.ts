import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';

import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';

const imageOf = (image: unknown) =>
  image ? unmarshall(image as Record<string, AttributeValue>) : undefined;

// The account a confirmation just turned from PENDING to ACTIVE, or null (Q139, Q349).
export function confirmedAccountOf(record: DynamoDBRecord): Account.Id | null {
  if (record.eventName !== 'MODIFY') {
    return null;
  }

  const before = imageOf(record.dynamodb?.OldImage);
  const after = imageOf(record.dynamodb?.NewImage);

  if (
    after?.type !== AccountItem.type ||
    before?.status !== accountStatuses.Pending ||
    after.status !== accountStatuses.Active ||
    !Account.isId(after.id)
  ) {
    return null;
  }

  return after.id;
}
