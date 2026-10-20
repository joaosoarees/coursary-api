import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoCourseDeletion } from '@infra/database/dynamo/repositories/course/DynamoCourseDeletion';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
let world: Awaited<ReturnType<typeof courseWorld>>;
let deletion: DynamoCourseDeletion;

beforeEach(async () => {
  world = await courseWorld();
  deletion = new DynamoCourseDeletion(config);
});

const partition = async () => {
  const { Items = [] } = await dynamoClient.send(
    new QueryCommand({
      TableName: config.mainTableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `COURSE#${world.course.id}` },
      ConsistentRead: true,
    }),
  );

  return Items;
};

const content = async (lessonId: string) => {
  const { Item } = await dynamoClient.send(
    new GetCommand({
      TableName: config.mainTableName,
      Key: { PK: `LESSON#${lessonId}`, SK: 'CONTENT' },
      ConsistentRead: true,
    }),
  );

  return Item;
};

describe('DynamoCourseDeletion', () => {
  it('should delete the description, modules, lessons and their bodies, then the course', async () => {
    await world.courses.update(world.course, { description: 'About' });
    const module = await world.addModule('M1', 0);
    const first = await world.addLesson(module, 0);
    const second = await world.addLesson(module, 1);
    await world.courses.markDeleting(world.course.id);

    let pages = 0;
    let outcome;
    do {
      outcome = await deletion.deleteNextPage(world.course.id);
      pages += 1;
    } while (outcome === 'more' && pages < 10);

    expect(outcome).toBe('done');
    await expect(partition()).resolves.toEqual([]);
    await expect(content(first.id)).resolves.toBeUndefined();
    await expect(content(second.id)).resolves.toBeUndefined();
    await expect(deletion.deleteNextPage(world.course.id)).resolves.toBe(
      'done',
    );
  });

  it('should never touch a course that is not marked for deletion', async () => {
    await world.addModule('M1', 0);

    await expect(deletion.deleteNextPage(world.course.id)).resolves.toBe(
      'not-deleting',
    );
    expect((await partition()).length).toBe(2);
  });
});
