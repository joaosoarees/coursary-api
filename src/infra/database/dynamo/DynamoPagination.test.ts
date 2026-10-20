import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import { InvalidCursor } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();

interface TestItem extends Record<string, unknown> {
  PK: string;
  SK: string;
  kept: boolean;
}

async function seed(keptPositions: number[], total: number) {
  const PK = `PAGINATION#${crypto.randomUUID()}`;
  const items = Array.from({ length: total }, (_, index) => ({
    PK,
    SK: `ITEM#${String(index + 1).padStart(2, '0')}`,
    kept: keptPositions.includes(index + 1),
  }));
  const command = new BatchWriteCommand({
    RequestItems: {
      [config.mainTableName]: items.map((Item) => ({ PutRequest: { Item } })),
    },
  });

  await dynamoClient.send(command);

  return PK;
}

function makeQuery(PK: string, onlyKept: boolean) {
  const keySchema = z.strictObject({
    PK: z.literal(PK),
    SK: z.string().startsWith('ITEM#'),
  });
  const input = {
    TableName: config.mainTableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': PK,
      ...(onlyKept ? { ':kept': true } : {}),
    },
    ...(onlyKept ? { FilterExpression: 'kept = :kept' } : {}),
  };

  const pagination = new DynamoPagination(keySchema);

  return (options: Page.Options) =>
    pagination.queryPage<TestItem>(input, options);
}

async function readAll(
  query: (options: Page.Options) => Promise<Page<TestItem>>,
  limit: number,
) {
  const pages: Page<TestItem>[] = [];
  let cursor: string | undefined;

  do {
    const page = await query({ limit, cursor });
    pages.push(page);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return pages;
}

describe('DynamoPagination.queryPage', () => {
  it('should page through a partition and end with a null cursor', async () => {
    const PK = await seed([], 5);

    const pages = await readAll(makeQuery(PK, false), 2);

    expect(pages.map((page) => page.items.map((item) => item.SK))).toEqual([
      ['ITEM#01', 'ITEM#02'],
      ['ITEM#03', 'ITEM#04'],
      ['ITEM#05'],
    ]);
    expect(pages.at(-1)?.nextCursor).toBeNull();
  });

  it('should keep reading past filtered items and accept a short page with a cursor', async () => {
    const PK = await seed([1, 15], 15);

    const pages = await readAll(makeQuery(PK, true), 1);
    const read = pages.flatMap((page) => page.items.map((item) => item.SK));

    expect(read).toEqual(['ITEM#01', 'ITEM#15']);
    expect(
      pages.some((page) => page.items.length === 0 && page.nextCursor),
    ).toBe(true);
  });

  it('should refuse a cursor from another partition', async () => {
    const PK = await seed([], 3);
    const other = await seed([], 3);
    const [otherPage] = await readAll(makeQuery(other, false), 1);

    await expect(
      makeQuery(
        PK,
        false,
      )({
        limit: 1,
        cursor: otherPage?.nextCursor ?? undefined,
      }),
    ).rejects.toBeInstanceOf(InvalidCursor);
  });
});
