import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';

import { Course } from '@application/entities/course/Course';
import { Lesson } from '@application/entities/outline/Lesson';
import { Answer } from '@application/entities/question/Answer';
import { Question } from '@application/entities/question/Question';
import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import { LessonItem } from '@infra/database/dynamo/items/outline/LessonItem';
import { AnswerItem } from '@infra/database/dynamo/items/question/AnswerItem';
import { QuestionItem } from '@infra/database/dynamo/items/question/QuestionItem';
import { archivedCourseOf } from '@infra/database/dynamo/stream/archivedCourses';

// The record's own time: the same on every redelivery, so a notification keeps its id.
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

  if (
    item.type === LessonItem.type &&
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
