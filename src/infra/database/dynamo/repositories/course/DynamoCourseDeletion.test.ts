import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { courseWorld } from '@tests/support/courseWorld';

import type { Course } from '@application/entities/course/Course';
import { File } from '@application/entities/file/File';
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

const lessonPartition = async (lessonId: string) => {
  const { Items = [] } = await dynamoClient.send(
    new QueryCommand({
      TableName: config.mainTableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `LESSON#${lessonId}` },
      ConsistentRead: true,
    }),
  );

  return Items;
};

const addMaterial = async (lessonId: string) => {
  const file = File.create({
    ownerId: lessonId,
    purpose: 'attachment',
    contentType: 'application/pdf',
    name: 'Slides.pdf',
  });
  await world.files.create(file);
};

// What the job does, one message after another.
const deleteAll = async (courseId: Course.Id) => {
  for (let pages = 0; pages < 10; pages += 1) {
    const page = await deletion.nextPage(courseId);

    if (typeof page === 'string') {
      return page;
    }

    await deletion.deletePage(page);
  }

  return 'unfinished';
};

describe('DynamoCourseDeletion', () => {
  it('should delete the description, modules, lessons with their partitions, then the course', async () => {
    await world.courses.update(world.course, { description: 'About' });
    const module = await world.addModule('M1', 0);
    const first = await world.addLesson(module, 0);
    const second = await world.addLesson(module, 1);
    await addMaterial(first.id);
    await world.courses.markDeleting(world.course.id);

    await expect(deleteAll(world.course.id)).resolves.toBe('done');

    await expect(partition()).resolves.toEqual([]);
    await expect(lessonPartition(first.id)).resolves.toEqual([]);
    await expect(lessonPartition(second.id)).resolves.toEqual([]);
  });

  it('should name the lessons of a page without deleting anything, and the course item last', async () => {
    const module = await world.addModule('M1', 0);
    const lesson = await world.addLesson(module, 0);
    await world.courses.markDeleting(world.course.id);

    const page = await deletion.nextPage(world.course.id);

    expect(page).toMatchObject({ lessonIds: [lesson.id], last: false });
    expect((await partition()).length).toBe(3);

    if (typeof page !== 'string') {
      await deletion.deletePage(page);
    }
    const last = await deletion.nextPage(world.course.id);

    expect(last).toMatchObject({ lessonIds: [], last: true });
    expect((await partition()).length).toBe(1);
  });

  it('should never touch a course that is not marked for deletion', async () => {
    await world.addModule('M1', 0);

    await expect(deletion.nextPage(world.course.id)).resolves.toBe(
      'not-deleting',
    );
    expect((await partition()).length).toBe(2);
  });
});
