import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';

import { Course, courseStatuses } from '@application/entities/course/Course';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';

const imageOf = (image: unknown) =>
  image ? unmarshall(image as Record<string, AttributeValue>) : undefined;

// The course an archive just moved from PUBLISHED to ARCHIVED, or null (Q232, Q358).
export function archivedCourseOf(record: DynamoDBRecord): Course.Id | null {
  if (record.eventName !== 'MODIFY') {
    return null;
  }

  const before = imageOf(record.dynamodb?.OldImage);
  const after = imageOf(record.dynamodb?.NewImage);

  if (
    after?.type !== CourseItem.type ||
    before?.status !== courseStatuses.Published ||
    after.status !== courseStatuses.Archived ||
    !Course.isId(after.id)
  ) {
    return null;
  }

  return after.id;
}
