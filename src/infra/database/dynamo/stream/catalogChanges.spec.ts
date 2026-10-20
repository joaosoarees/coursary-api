import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { courseToIndex } from '@infra/database/dynamo/stream/catalogChanges';

const course = (fields: Record<string, unknown> = {}) => ({
  PK: 'COURSE#c1',
  SK: 'COURSE#c1',
  type: 'Course',
  id: 'c1',
  title: 'DynamoDB',
  instructorName: 'Ana',
  status: 'PUBLISHED',
  publishedAt: '2026-10-17T12:00:00.000Z',
  enrollmentCount: 0,
  ...fields,
});

const description = (text: string) => ({
  PK: 'COURSE#c1',
  SK: 'DESCRIPTION',
  type: 'CourseDescription',
  courseId: 'c1',
  description: text,
});

const record = (
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): DynamoDBRecord => ({
  eventName: !before ? 'INSERT' : !after ? 'REMOVE' : 'MODIFY',
  dynamodb: {
    ...(before ? { OldImage: marshall(before) as never } : {}),
    ...(after ? { NewImage: marshall(after) as never } : {}),
  },
});

describe('courseToIndex', () => {
  it.each([
    ['publishing', course({ status: 'DRAFT' }), course()],
    ['archiving', course(), course({ status: 'ARCHIVED' })],
    ['a new title', course(), course({ title: 'Streams' })],
    ['a new instructor name', course(), course({ instructorName: 'Bia' })],
    ['removing a published course', course(), undefined],
  ])('should route %s', (_, before, after) => {
    expect(courseToIndex(record(before, after))).toBe('c1');
  });

  it.each([
    ['a counter', course(), course({ enrollmentCount: 1 })],
    [
      'a draft being renamed',
      course({ status: 'DRAFT' }),
      course({ status: 'DRAFT', title: 'Streams' }),
    ],
    ['a new draft', undefined, course({ status: 'DRAFT' })],
  ])('should not route %s', (_, before, after) => {
    expect(courseToIndex(record(before, after))).toBeNull();
  });

  it('should route a description that changes, appears or goes', () => {
    expect(courseToIndex(record(description('Old'), description('New')))).toBe(
      'c1',
    );
    expect(courseToIndex(record(undefined, description('New')))).toBe('c1');
    expect(courseToIndex(record(description('Old'), undefined))).toBe('c1');
    expect(
      courseToIndex(record(description('Same'), description('Same'))),
    ).toBeNull();
  });

  it('should pass over other items', () => {
    expect(
      courseToIndex(record(undefined, { PK: 'ACCOUNT#a', type: 'Account' })),
    ).toBeNull();
  });
});
