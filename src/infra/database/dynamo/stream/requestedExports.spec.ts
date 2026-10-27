import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { requestedExportOf } from '@infra/database/dynamo/stream/requestedExports';

const exportId = anAccountId();
const record = (
  eventName: DynamoDBRecord['eventName'],
  type = 'StudentExport',
): DynamoDBRecord => ({
  eventName,
  dynamodb: {
    NewImage: marshall({ type, id: exportId, status: 'PENDING' }) as never,
  },
});

const removal: DynamoDBRecord = { eventName: 'REMOVE', dynamodb: {} };

describe('requestedExportOf', () => {
  it('should take an export just asked for', () => {
    expect(requestedExportOf(record('INSERT'))).toBe(exportId);
  });

  it.each([
    ['an export marked ready', record('MODIFY')],
    ['another item inserted', record('INSERT', 'Course')],
    ['a removal', removal],
  ])('should pass over %s', (_, change) => {
    expect(requestedExportOf(change)).toBeNull();
  });
});
