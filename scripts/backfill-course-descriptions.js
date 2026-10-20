// Moves the description out of every course item into COURSE#c / DESCRIPTION (Q298, Q310).
// Idempotent: a course already moved has no description attribute and is not read again.
// Usage: node scripts/backfill-course-descriptions.js --stage dev [--dry-run]
import { parseArgs } from 'node:util';

import {
  DynamoDBClient,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const { values } = parseArgs({
  options: {
    stage: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

if (!values.stage) {
  console.error(
    'Usage: backfill-course-descriptions.js --stage <stage> [--dry-run]',
  );
  process.exit(1);
}

const tableName = `coursary-api-${values.stage}-MainTable`;
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const removeFromCourse = (course) => ({
  TableName: tableName,
  Key: { PK: course.PK, SK: course.SK },
  UpdateExpression: 'REMOVE description',
  ConditionExpression: 'description = :read',
  ExpressionAttributeValues: { ':read': course.description },
});

const move = async (course) => {
  if (!course.description) {
    await client.send(new UpdateCommand(removeFromCourse(course)));

    return 'emptied';
  }

  try {
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName,
              Item: {
                PK: course.PK,
                SK: 'DESCRIPTION',
                courseId: course.id,
                description: course.description,
                type: 'CourseDescription',
              },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          { Update: removeFromCourse(course) },
        ],
      }),
    );

    return 'moved';
  } catch (error) {
    // Edited after the deploy: the new item wins and the old copy goes.
    if (
      error instanceof TransactionCanceledException &&
      error.CancellationReasons?.[0]?.Code === 'ConditionalCheckFailed'
    ) {
      await client.send(new UpdateCommand(removeFromCourse(course)));

      return 'kept newer';
    }

    throw error;
  }
};

const counts = { moved: 0, emptied: 0, 'kept newer': 0 };
let startKey;

do {
  const page = await client.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: '#type = :course AND attribute_exists(description)',
      ProjectionExpression: 'PK, SK, id, description',
      ExpressionAttributeNames: { '#type': 'type' },
      ExpressionAttributeValues: { ':course': 'Course' },
      ExclusiveStartKey: startKey,
    }),
  );

  for (const course of page.Items ?? []) {
    if (values['dry-run']) {
      console.log(
        `would move ${course.id} (${String(course.description.length)} chars)`,
      );
      continue;
    }

    const outcome = await move(course);
    counts[outcome] += 1;
    console.log(`${outcome.padEnd(10)} ${course.id}`);
  }

  startKey = page.LastEvaluatedKey;
} while (startKey);

console.log(
  values['dry-run'] ? 'Dry run: nothing written.' : JSON.stringify(counts),
);
