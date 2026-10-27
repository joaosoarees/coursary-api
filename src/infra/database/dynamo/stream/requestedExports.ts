import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';

import { StudentExport } from '@application/entities/export/StudentExport';
import { StudentExportItem } from '@infra/database/dynamo/items/export/StudentExportItem';

// An export just asked for, or null (Q423).
export function requestedExportOf(
  record: DynamoDBRecord,
): StudentExport.Id | null {
  if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) {
    return null;
  }

  const after = unmarshall(
    record.dynamodb.NewImage as Record<string, AttributeValue>,
  );

  if (after.type !== StudentExportItem.type || !StudentExport.isId(after.id)) {
    return null;
  }

  return after.id;
}
