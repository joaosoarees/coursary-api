import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';

import { dynamoClient } from '@infra/clients/dynamoClient';

export const batchGetAll = {
  maxKeys: 100,

  maxRounds: 3,

  // Every item of the keys that exists, asking again for what DynamoDB left unprocessed.
  async read(
    tableName: string,
    keys: Record<string, unknown>[],
    what: string,
  ): Promise<unknown[]> {
    if (keys.length > batchGetAll.maxKeys) {
      throw new Error(
        `BatchGet reads at most ${String(batchGetAll.maxKeys)} ${what}.`,
      );
    }

    const items: unknown[] = [];
    let pending = keys;

    for (
      let round = 0;
      pending.length > 0 && round < batchGetAll.maxRounds;
      round++
    ) {
      if (round > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** round));
      }

      const { Responses, UnprocessedKeys } = await dynamoClient.send(
        new BatchGetCommand({
          RequestItems: { [tableName]: { Keys: pending } },
        }),
      );
      items.push(...(Responses?.[tableName] ?? []));
      pending = UnprocessedKeys?.[tableName]?.Keys ?? [];
    }

    if (pending.length > 0) {
      throw new Error(
        `BatchGet left ${String(pending.length)} ${what} unread.`,
      );
    }

    return items;
  },
};
