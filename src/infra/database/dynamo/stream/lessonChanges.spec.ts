import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { lessonChangeOf } from '@infra/database/dynamo/stream/lessonChanges';

const lessonId = KSUID.randomSync().string;
const questionId = KSUID.randomSync().string;

const record = (
  eventName: DynamoDBRecord['eventName'],
  item: Record<string, unknown>,
): DynamoDBRecord => ({
  eventName,
  dynamodb:
    eventName === 'REMOVE'
      ? { OldImage: marshall(item) as never }
      : { NewImage: marshall(item) as never },
});

const question = { type: 'Question', id: questionId, lessonId };
const answer = {
  type: 'Answer',
  id: KSUID.randomSync().string,
  lessonId,
  questionId,
};

describe('lessonChangeOf', () => {
  it.each([
    ['a question asked', record('INSERT', question)],
    ['a question counted or removed', record('MODIFY', question)],
    ['a question deleted', record('REMOVE', question)],
  ])('should take %s as a change of the list', (_, change) => {
    expect(lessonChangeOf(change)).toEqual({ lessonId, questionId: null });
  });

  it.each([
    ['an answer given', record('INSERT', answer)],
    ['an answer deleted', record('REMOVE', answer)],
  ])('should take %s as a change of its question', (_, change) => {
    expect(lessonChangeOf(change)).toEqual({ lessonId, questionId });
  });

  it.each([
    ['another item', record('INSERT', { type: 'Course', id: lessonId })],
    [
      'a question without a lesson',
      record('INSERT', { ...question, lessonId: 'x' }),
    ],
    ['a record without an image', { eventName: 'MODIFY', dynamodb: {} }],
  ])('should pass over %s', (_, change) => {
    expect(lessonChangeOf(change as DynamoDBRecord)).toBeNull();
  });
});
