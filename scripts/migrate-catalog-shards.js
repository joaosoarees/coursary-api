// Moves every published course from the catalog's old partition (GSI2PK = CATALOG) to its shard.
// Safe to run again: a course already moved is no longer in the old partition.
// Usage: node scripts/migrate-catalog-shards.js --stage dev [--dry-run]
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  paginateQuery,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const LEGACY = 'CATALOG';
const SHARD_COUNT = 4;

// The same shard as CourseItem.getGSI2PK; a test compares the two.
export const shardOf = (courseId) =>
  `CATALOG#${String(createHash('sha256').update(courseId).digest()[0] % SHARD_COUNT)}`;

// Built for every run: the paginator writes ExclusiveStartKey into the input it is given.
const oldPartition = (tableName, extra = {}) => ({
  TableName: tableName,
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :pk',
  ExpressionAttributeValues: { ':pk': LEGACY },
  ...extra,
});

export async function countLeft({ client, tableName }) {
  let left = 0;

  for await (const page of paginateQuery(
    { client },
    oldPartition(tableName, { Select: 'COUNT' }),
  )) {
    left += page.Count ?? 0;
  }

  return left;
}

export async function migrateCatalog({
  client,
  tableName,
  dryRun = false,
  log = console.log,
}) {
  const counts = { moved: 0, skipped: 0 };

  for await (const page of paginateQuery(
    { client },
    oldPartition(tableName, { ProjectionExpression: 'PK, SK, id' }),
  )) {
    for (const course of page.Items ?? []) {
      const shard = shardOf(course.id);

      if (dryRun) {
        log(`would move ${course.id} to ${shard}`);
        continue;
      }

      try {
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { PK: course.PK, SK: course.SK },
            UpdateExpression: 'SET GSI2PK = :shard',
            // Archived or already moved since the read: nothing to do, and nothing created.
            ConditionExpression: 'GSI2PK = :legacy AND #status = :published',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':shard': shard,
              ':legacy': LEGACY,
              ':published': 'PUBLISHED',
            },
          }),
        );
        counts.moved += 1;
        log(`moved ${course.id} to ${shard}`);
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) {
          counts.skipped += 1;
          log(`skipped ${course.id}`);
          continue;
        }

        throw error;
      }
    }
  }

  return {
    ...counts,
    left: await settledLeft({
      client,
      tableName,
      expected: dryRun ? Infinity : counts.skipped,
    }),
  };
}

// The index is read eventually consistent: right after the moves it can still list some of
// them. Only the skipped courses are meant to stay.
async function settledLeft({ client, tableName, expected }) {
  let left = await countLeft({ client, tableName });

  for (let attempt = 0; left > expected && attempt < 5; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    left = await countLeft({ client, tableName });
  }

  return left;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { values } = parseArgs({
    options: {
      stage: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  if (!values.stage) {
    console.error(
      'Usage: migrate-catalog-shards.js --stage <stage> [--dry-run]',
    );
    process.exit(1);
  }

  const result = await migrateCatalog({
    client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
    tableName: `coursary-api-${values.stage}-MainTable`,
    dryRun: values['dry-run'],
  });

  console.log(
    values['dry-run']
      ? `Dry run: nothing written; ${String(result.left)} in the old partition.`
      : JSON.stringify(result),
  );
}
