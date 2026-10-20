import {
  BatchGetCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';

import { setCourseFields } from '@tests/support/courseWorld';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import {
  CourseArchived,
  CourseEmpty,
  CourseNotDraft,
  CourseNotFound,
  CourseNotPublished,
} from '@application/errors/course';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const repository = new DynamoCourseRepository(config);
const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });

const newCourse = async (description = 'Keys') => {
  const course = Course.create({ instructor, title: 'DynamoDB' });
  await repository.create(course, description);

  return course;
};

const storedDescription = async (course: Course) => {
  const { Item } = await dynamoClient.send(
    new GetCommand({
      TableName: config.mainTableName,
      Key: { PK: `COURSE#${course.id}`, SK: 'DESCRIPTION' },
      ConsistentRead: true,
    }),
  );

  return Item;
};

describe('DynamoCourseRepository', () => {
  it('should create a course and find it and its description by id', async () => {
    const course = await newCourse();

    await expect(repository.findById(course.id)).resolves.toEqual(course);
    await expect(repository.findDescription(course.id)).resolves.toBe('Keys');
  });

  it('should store nothing for an empty description and read it as empty', async () => {
    const course = await newCourse('');

    expect(await storedDescription(course)).toBeUndefined();
    await expect(repository.findDescription(course.id)).resolves.toBe('');
  });

  it('should keep the course item at one write unit whatever the description', async () => {
    const course = await newCourse('x'.repeat(5000));
    await setCourseFields(course, { lessonCount: 1 });
    await repository.publish(course.id, new Date());

    const { ConsumedCapacity } = await dynamoClient.send(
      new UpdateCommand({
        TableName: config.mainTableName,
        Key: { PK: `COURSE#${course.id}`, SK: `COURSE#${course.id}` },
        UpdateExpression: 'ADD enrollmentCount :one',
        ExpressionAttributeValues: { ':one': 1 },
        ReturnConsumedCapacity: 'INDEXES',
      }),
    );

    // With the description inside, the same ADD cost 6 units in the table and 6 in each index.
    expect(ConsumedCapacity).toMatchObject({
      Table: { CapacityUnits: 1 },
      GlobalSecondaryIndexes: {
        GSI1: { CapacityUnits: 1 },
        GSI2: { CapacityUnits: 1 },
      },
    });
  });

  it.each([
    [{ title: 'Streams' }, 'Streams', 'Keys'],
    [{ description: 'Indexes' }, 'DynamoDB', 'Indexes'],
    [{ title: 'Streams', description: 'Indexes' }, 'Streams', 'Indexes'],
  ])(
    'should write only what %o changes',
    async (changes, title, description) => {
      const course = await newCourse();

      await repository.update(course, changes);

      expect((await repository.findById(course.id))?.title).toBe(title);
      await expect(repository.findDescription(course.id)).resolves.toBe(
        description,
      );
    },
  );

  it('should delete the description item when the description is cleared', async () => {
    const course = await newCourse();

    await repository.update(course, { description: '' });

    expect(await storedDescription(course)).toBeUndefined();
  });

  it.each([{ title: 'X' }, { description: 'X' }])(
    'should refuse to change %o in an archived course',
    async (changes) => {
      const course = await newCourse();
      await setCourseFields(course, { status: 'ARCHIVED' });

      await expect(repository.update(course, changes)).rejects.toBeInstanceOf(
        CourseArchived,
      );
      await expect(repository.findDescription(course.id)).resolves.toBe('Keys');
    },
  );

  it.each([{ title: 'X' }, { description: 'X' }])(
    'should refuse to change %o in a course that does not exist',
    async (changes) => {
      const missing = Course.create({ instructor, title: 'T' });

      await expect(repository.update(missing, changes)).rejects.toBeInstanceOf(
        CourseNotFound,
      );
      expect(await storedDescription(missing)).toBeUndefined();
    },
  );

  it('should find many courses by id at once, leaving out the missing ones', async () => {
    const first = await newCourse();
    const second = await newCourse();
    const missing = Course.create({ instructor, title: 'Gone' });

    const found = await repository.findManyByIds([
      first.id,
      missing.id,
      second.id,
      first.id,
    ]);

    expect([...found.keys()].sort()).toEqual([first.id, second.id].sort());
    expect(found.get(first.id)).toEqual(first);
  });

  it('should ask again for the courses BatchGet left unread, and fail when they stay unread', async () => {
    const course = await newCourse();
    const send = dynamoClient.send.bind(dynamoClient);
    let unread = 1;
    // Answers BatchGet as if DynamoDB had read nothing, while unread lasts.
    const fakeSend = (command: unknown): Promise<unknown> => {
      if (command instanceof BatchGetCommand && unread > 0) {
        unread -= 1;
        const requested = command.input.RequestItems ?? {};

        return Promise.resolve({ Responses: {}, UnprocessedKeys: requested });
      }

      return send(command as BatchGetCommand);
    };
    vi.spyOn(dynamoClient, 'send').mockImplementation(fakeSend as never);

    await expect(repository.findManyByIds([course.id])).resolves.toHaveProperty(
      'size',
      1,
    );

    unread = DynamoCourseRepository.maxBatchRounds;
    await expect(repository.findManyByIds([course.id])).rejects.toThrow(
      'BatchGet left 1 courses unread.',
    );
  });

  it('should copy a new instructor name into every course of the instructor only', async () => {
    const ana = Account.create({ name: 'Ana', email: 'a@example.com' });
    const bia = Account.create({ name: 'Bia', email: 'b@example.com' });
    const anaCourses = [
      Course.create({ instructor: ana, title: 'A1' }),
      Course.create({ instructor: ana, title: 'A2' }),
    ];
    const biaCourse = Course.create({ instructor: bia, title: 'B1' });
    for (const course of [...anaCourses, biaCourse]) {
      await repository.create(course);
    }

    await repository.updateInstructorName(ana.id, 'Ana Souza');

    for (const course of anaCourses) {
      expect((await repository.findById(course.id))?.instructorName).toBe(
        'Ana Souza',
      );
    }
    expect((await repository.findById(biaCourse.id))?.instructorName).toBe(
      'Bia',
    );
  });

  const catalogEntry = async (course: Course) => {
    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: { PK: `COURSE#${course.id}`, SK: `COURSE#${course.id}` },
        ConsistentRead: true,
      }),
    );

    return Item?.GSI2PK as string | undefined;
  };

  it('should publish a course with lessons into the catalog and archive it out', async () => {
    const course = await newCourse();
    await setCourseFields(course, { lessonCount: 1 });

    const published = await repository.publish(course.id, new Date());
    expect(published.status).toBe('PUBLISHED');
    expect(await catalogEntry(course)).toBe('CATALOG');

    const archived = await repository.archive(course.id);
    expect(archived.status).toBe('ARCHIVED');
    expect(await catalogEntry(course)).toBeUndefined();
  });

  it('should refuse to publish a course without lessons, and to archive a draft', async () => {
    const course = await newCourse();

    await expect(
      repository.publish(course.id, new Date()),
    ).rejects.toBeInstanceOf(CourseEmpty);
    await expect(repository.archive(course.id)).rejects.toBeInstanceOf(
      CourseNotPublished,
    );
    expect(await catalogEntry(course)).toBeUndefined();
  });

  it('should mark a draft as being deleted, out of every list and every read', async () => {
    const course = await newCourse();

    await repository.markDeleting(course.id);

    await expect(repository.findById(course.id)).resolves.toBeNull();
    await expect(repository.findManyByIds([course.id])).resolves.toEqual(
      new Map(),
    );
    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: { PK: `COURSE#${course.id}`, SK: `COURSE#${course.id}` },
        ConsistentRead: true,
      }),
    );
    expect(Item).toMatchObject({ status: 'DELETING' });
    expect(Item).not.toHaveProperty('GSI1PK');
    await expect(repository.markDeleting(course.id)).rejects.toBeInstanceOf(
      CourseNotFound,
    );
  });

  it.each(['PUBLISHED', 'ARCHIVED'] as const)(
    'should refuse to delete a %s course',
    async (status) => {
      const course = await newCourse();
      await setCourseFields(course, { status });

      await expect(repository.markDeleting(course.id)).rejects.toBeInstanceOf(
        CourseNotDraft,
      );
    },
  );
});
