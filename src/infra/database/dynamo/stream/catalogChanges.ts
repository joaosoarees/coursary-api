import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';

import {
  type Course,
  courseStatuses,
} from '@application/entities/course/Course';
import { CourseDescriptionItem } from '@infra/database/dynamo/items/course/CourseDescriptionItem';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';

type Image = Record<string, unknown>;

// The course whose search record a change affects, or null (Q315).
export function courseToIndex(record: DynamoDBRecord): Course.Id | null {
  const before = imageOf(record.dynamodb?.OldImage);
  const after = imageOf(record.dynamodb?.NewImage);
  const type = (after ?? before)?.type;

  if (type === CourseItem.type) {
    const changed = indexedView(before) !== indexedView(after);

    return changed
      ? (((after ?? before)?.id as Course.Id | undefined) ?? null)
      : null;
  }

  if (type === CourseDescriptionItem.type) {
    const changed = before?.description !== after?.description;

    return changed
      ? (((after ?? before)?.courseId as Course.Id | undefined) ?? null)
      : null;
  }

  return null;
}

function imageOf(
  image: Record<string, unknown> | undefined,
): Image | undefined {
  return image
    ? unmarshall(image as Record<string, AttributeValue>)
    : undefined;
}

// What the index holds of a course; counters are not in it (Q314).
function indexedView(course: Image | undefined): string | null {
  if (course?.status !== courseStatuses.Published) {
    return null;
  }

  return JSON.stringify([
    course.title,
    course.instructorName,
    course.publishedAt,
  ]);
}
