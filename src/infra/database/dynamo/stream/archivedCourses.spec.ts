import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { archivedCourseOf } from '@infra/database/dynamo/stream/archivedCourses';

const courseId = anAccountId();
const course = (status: string, type = 'Course') => ({
  type,
  id: courseId,
  status,
});

const modify = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): DynamoDBRecord => ({
  eventName: 'MODIFY',
  dynamodb: {
    OldImage: marshall(before) as never,
    NewImage: marshall(after) as never,
  },
});

describe('archivedCourseOf', () => {
  it('should take a course the archive moved out of the catalog', () => {
    expect(
      archivedCourseOf(modify(course('PUBLISHED'), course('ARCHIVED'))),
    ).toBe(courseId);
  });

  it.each([
    ['a publish', modify(course('DRAFT'), course('PUBLISHED'))],
    [
      'an archived course changed again',
      modify(course('ARCHIVED'), course('ARCHIVED')),
    ],
    [
      'a counter on a published course',
      modify(course('PUBLISHED'), course('PUBLISHED')),
    ],
    [
      'another item',
      modify(course('PUBLISHED', 'Module'), course('ARCHIVED', 'Module')),
    ],
  ])('should pass over %s', (_, record) => {
    expect(archivedCourseOf(record)).toBeNull();
  });
});
