import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { deletedCourseOf } from '@infra/database/dynamo/stream/deletedCourses';

const courseId = anAccountId();
const course = (status: string) => ({ type: 'Course', id: courseId, status });

const modify = (before: string, after: string): DynamoDBRecord => ({
  eventName: 'MODIFY',
  dynamodb: {
    OldImage: marshall(course(before)) as never,
    NewImage: marshall(course(after)) as never,
  },
});

describe('deletedCourseOf', () => {
  it('should take a draft marked for deletion', () => {
    expect(deletedCourseOf(modify('DRAFT', 'DELETING'))).toBe(courseId);
  });

  it.each([
    ['a publish', modify('DRAFT', 'PUBLISHED')],
    ['a course already being deleted', modify('DELETING', 'DELETING')],
    ['a draft renamed', modify('DRAFT', 'DRAFT')],
  ])('should pass over %s', (_, record) => {
    expect(deletedCourseOf(record)).toBeNull();
  });
});
