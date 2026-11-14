import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';

import { Course } from '@application/entities/course/Course';
import {
  exportStatuses,
  StudentExport,
} from '@application/entities/export/StudentExport';
import { Lesson } from '@application/entities/outline/Lesson';
import { Answer } from '@application/entities/question/Answer';
import { Question } from '@application/entities/question/Question';
import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import { StudentExportItem } from '@infra/database/dynamo/items/export/StudentExportItem';
import { LessonContentItem } from '@infra/database/dynamo/items/outline/LessonContentItem';
import { AnswerItem } from '@infra/database/dynamo/items/question/AnswerItem';
import { QuestionItem } from '@infra/database/dynamo/items/question/QuestionItem';
import { archivedCourseOf } from '@infra/database/dynamo/stream/archivedCourses';

// The record's own time: the same on every redelivery, so a notification keeps its id.
const imageOf = (image: unknown) =>
  image ? unmarshall(image as Record<string, AttributeValue>) : undefined;

const readyExportOf = (record: DynamoDBRecord): StudentExport.Id | null => {
  if (record.eventName !== 'MODIFY') {
    return null;
  }

  const before = imageOf(record.dynamodb?.OldImage);
  const after = imageOf(record.dynamodb?.NewImage);

  return after?.type === StudentExportItem.type &&
    before?.status === exportStatuses.Pending &&
    after.status === exportStatuses.Ready &&
    StudentExport.isId(after.id)
    ? after.id
    : null;
};

const occurredAtOf = (record: DynamoDBRecord): string => {
  const seconds = record.dynamodb?.ApproximateCreationDateTime;

  if (seconds === undefined) {
    throw new Error(`Record ${String(record.eventID)} has no creation time.`);
  }

  return new Date(seconds * 1000).toISOString();
};

export function notificationEventOf(
  record: DynamoDBRecord,
): NotificationQueue.Request | null {
  const courseId = archivedCourseOf(record);

  if (courseId) {
    return { kind: 'archived', courseId, occurredAt: occurredAtOf(record) };
  }

  const exportId = readyExportOf(record);

  if (exportId) {
    return {
      kind: 'export-ready',
      exportId,
      occurredAt: occurredAtOf(record),
    };
  }

  if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) {
    return null;
  }

  const item = unmarshall(
    record.dynamodb.NewImage as Record<string, AttributeValue>,
  );

  if (
    item.type === AnswerItem.type &&
    Lesson.isId(item.lessonId) &&
    Question.isId(item.questionId) &&
    Answer.isId(item.id)
  ) {
    return {
      kind: 'answer',
      lessonId: item.lessonId,
      questionId: item.questionId,
      answerId: item.id,
    };
  }

  if (
    item.type === QuestionItem.type &&
    Lesson.isId(item.lessonId) &&
    Question.isId(item.id)
  ) {
    return { kind: 'question', lessonId: item.lessonId, questionId: item.id };
  }

  // The content, not the summary: moving a lesson to another module puts its summary again.
  if (
    item.type === LessonContentItem.type &&
    Course.isId(item.courseId) &&
    Lesson.isId(item.id)
  ) {
    return {
      kind: 'lesson',
      courseId: item.courseId,
      lessonId: item.id,
      occurredAt: occurredAtOf(record),
    };
  }

  return null;
}
