import { QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import type { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import { InvalidCursor } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';

type Key = Record<string, unknown>;

export class DynamoPagination<TKeySchema extends z.ZodObject> {
  static readonly maxRequests = 3;

  constructor(private readonly keySchema: TKeySchema) {}

  encodeCursor(key: Key): string {
    return Buffer.from(JSON.stringify(key)).toString('base64url');
  }

  decodeCursor(cursor: string): z.infer<TKeySchema> {
    let decoded: unknown;

    try {
      decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
      throw new InvalidCursor();
    }

    const result = this.keySchema.safeParse(decoded);

    if (!result.success) {
      throw new InvalidCursor();
    }

    return result.data;
  }

  async queryPage<TItem extends object>(
    input: Omit<QueryCommandInput, 'Limit' | 'ExclusiveStartKey'>,
    { limit, cursor }: Page.Options,
  ): Promise<Page<TItem>> {
    const items: TItem[] = [];
    let startKey: Key | undefined = cursor
      ? this.decodeCursor(cursor)
      : undefined;

    for (let request = 0; request < DynamoPagination.maxRequests; request++) {
      const command = new QueryCommand({
        ...input,
        Limit: limit + 1,
        ExclusiveStartKey: startKey,
      });
      const { Items = [], LastEvaluatedKey } = await dynamoClient.send(command);
      items.push(...(Items as TItem[]));

      if (items.length > limit) {
        const kept = items.slice(0, limit);

        return {
          items: kept,
          nextCursor: this.encodeCursor(this.pickKey(kept.at(-1))),
        };
      }

      if (!LastEvaluatedKey) {
        return { items, nextCursor: null };
      }

      startKey = LastEvaluatedKey;
    }

    return {
      items,
      nextCursor: startKey ? this.encodeCursor(startKey) : null,
    };
  }

  private pickKey(item: object | undefined): Key {
    const attributes = Object.keys(this.keySchema.shape);
    const values = new Map(Object.entries(item ?? {}));

    return Object.fromEntries(
      attributes.map((attribute) => [attribute, values.get(attribute)]),
    );
  }
}
