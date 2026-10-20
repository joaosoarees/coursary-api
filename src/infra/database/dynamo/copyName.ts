import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { dynamoClient } from '@infra/clients/dynamoClient';

const IN_FLIGHT = 4;

// Writes a display copy of a name into each item, one update per item and four
// at a time (Q290): no transaction, so a concurrent write to one item cannot
// cancel the rest. An item that already has the name, or is gone, is skipped;
// calling it again with the same name finishes what a failure left. Every item
// must already carry the attribute: a missing one fails the condition too.
export async function copyName({
  tableName,
  keys,
  attribute,
  name,
}: {
  tableName: string;
  keys: Record<string, unknown>[];
  attribute: string;
  name: string;
}): Promise<void> {
  const pending = [...keys];

  const worker = async () => {
    for (let Key = pending.shift(); Key; Key = pending.shift()) {
      const command = new UpdateCommand({
        TableName: tableName,
        Key,
        UpdateExpression: 'SET #attribute = :name',
        ConditionExpression: 'attribute_exists(PK) AND #attribute <> :name',
        ExpressionAttributeNames: { '#attribute': attribute },
        ExpressionAttributeValues: { ':name': name },
      });

      try {
        await dynamoClient.send(command);
      } catch (error) {
        if (!(error instanceof ConditionalCheckFailedException)) {
          throw error;
        }
      }
    }
  };

  await Promise.all(Array.from({ length: IN_FLIGHT }, worker));
}
