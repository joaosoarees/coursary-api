import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';

import { Lesson } from '@application/entities/outline/Lesson';
import { Question } from '@application/entities/question/Question';
import { AnswerItem } from '@infra/database/dynamo/items/question/AnswerItem';
import { QuestionItem } from '@infra/database/dynamo/items/question/QuestionItem';

// A question changed shows in the lesson's list; an answer, in its question's thread.
export function lessonChangeOf(
  record: DynamoDBRecord,
): { lessonId: Lesson.Id; questionId: Question.Id | null } | null {
  const image = record.dynamodb?.NewImage ?? record.dynamodb?.OldImage;

  if (!image) {
    return null;
  }

  const item = unmarshall(image as Record<string, AttributeValue>);

  if (!Lesson.isId(item.lessonId)) {
    return null;
  }

  if (item.type === QuestionItem.type) {
    return { lessonId: item.lessonId, questionId: null };
  }

  if (item.type === AnswerItem.type && Question.isId(item.questionId)) {
    return { lessonId: item.lessonId, questionId: item.questionId };
  }

  return null;
}
