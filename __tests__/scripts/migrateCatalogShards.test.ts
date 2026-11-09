import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import { DynamoCatalogQuery } from '@infra/database/dynamo/queries/catalog/DynamoCatalogQuery';
import { AppConfig } from '@shared/config/AppConfig';

import {
  countLeft,
  migrateCatalog,
  shardOf,
} from '../../scripts/migrate-catalog-shards.js';

const config = new AppConfig();
const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });
const lowLevel = new DynamoDBClient();

// A table of its own: the shared test table holds other tests' courses in the old partition.
let tableName = '';

beforeEach(async () => {
  tableName = `${config.mainTableName}-migration-${crypto.randomUUID()}`;
  const { Table } = await lowLevel.send(
    new DescribeTableCommand({ TableName: config.mainTableName }),
  );
  await lowLevel.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: Table?.AttributeDefinitions,
      KeySchema: Table?.KeySchema,
      GlobalSecondaryIndexes: Table?.GlobalSecondaryIndexes?.map((index) => ({
        IndexName: index.IndexName,
        KeySchema: index.KeySchema,
        Projection: index.Projection,
      })),
    }),
  );
});

afterEach(async () => {
  await lowLevel.send(new DeleteTableCommand({ TableName: tableName }));
});

const store = async (
  status: Course.Status,
  minute: number,
  GSI2PK: (course: Course) => string,
) => {
  const course = Course.create({ instructor, title: `At ${String(minute)}` });
  const publishedAt = new Date(Date.UTC(2025, 0, 1, 10, minute)).toISOString();
  await dynamoClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        ...CourseItem.fromEntity(course).toItem(),
        status,
        lessonCount: 1,
        publishedAt,
        GSI2PK: GSI2PK(course),
        GSI2SK: `${publishedAt}#${course.id}`,
      },
    }),
  );

  return course;
};

const partitionOf = async (course: Course) => {
  const { Item } = await dynamoClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: CourseItem.getPK(course.id), SK: CourseItem.getSK(course.id) },
    }),
  );

  return Item?.GSI2PK as string | undefined;
};

const catalogIds = async () => {
  const catalog = new DynamoCatalogQuery({
    mainTableName: tableName,
  } as AppConfig);
  const ids: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await catalog.execute({ limit: 3, cursor });
    ids.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return ids;
};

const quiet = () => undefined;

describe('migrate-catalog-shards', () => {
  it('should pick the same shard as CourseItem', () => {
    for (let index = 0; index < 200; index++) {
      const { id } = Course.create({ instructor, title: 'T' });

      expect(shardOf(id)).toBe(CourseItem.getGSI2PK(id));
    }
  });

  it('should list what it would move and write nothing on a dry run', async () => {
    const waiting = await store('PUBLISHED', 1, () => CourseItem.legacyGSI2PK);
    const lines: string[] = [];

    const result = await migrateCatalog({
      client: dynamoClient,
      tableName,
      dryRun: true,
      log: (line: string) => lines.push(line),
    });

    expect(lines).toContain(
      `would move ${waiting.id} to ${CourseItem.getGSI2PK(waiting.id)}`,
    );
    expect(result).toMatchObject({ moved: 0, skipped: 0 });
    expect(result.left).toBeGreaterThan(0);
    expect(await partitionOf(waiting)).toBe(CourseItem.legacyGSI2PK);
  });

  it('should move every published course to its shard, once, and keep the catalog', async () => {
    const legacy = await Promise.all(
      [2, 3, 4, 5, 6, 7].map((minute) =>
        store('PUBLISHED', minute, () => CourseItem.legacyGSI2PK),
      ),
    );
    const moved = await store('PUBLISHED', 8, (course) =>
      CourseItem.getGSI2PK(course.id),
    );
    const notPublished = await store(
      'ARCHIVED',
      9,
      () => CourseItem.legacyGSI2PK,
    );
    const before = await catalogIds();

    const first = await migrateCatalog({
      client: dynamoClient,
      tableName,
      log: quiet,
    });
    const second = await migrateCatalog({
      client: dynamoClient,
      tableName,
      log: quiet,
    });

    for (const course of [...legacy, moved]) {
      expect(await partitionOf(course)).toBe(CourseItem.getGSI2PK(course.id));
    }
    expect(await partitionOf(notPublished)).toBe(CourseItem.legacyGSI2PK);
    expect(first).toEqual({ moved: 6, skipped: 1, left: 1 });
    expect(second).toEqual({ moved: 0, skipped: 1, left: 1 });
    expect(await catalogIds()).toEqual(before);
    expect(await countLeft({ client: dynamoClient, tableName })).toBe(1);
  });
});
