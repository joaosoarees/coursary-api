import { marshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { notificationEventOf } from '@infra/database/dynamo/stream/notificationEvents';

const id = () => KSUID.randomSync().string;
const courseId = id();
const lessonId = id();
const questionId = id();
const answerId = id();
const writtenAt = Date.parse('2026-11-12T12:00:00.000Z') / 1000;

const record = (
  eventName: DynamoDBRecord['eventName'],
  NewImage: Record<string, unknown>,
  OldImage?: Record<string, unknown>,
): DynamoDBRecord => ({
  eventID: 'e1',
  eventName,
  dynamodb: {
    ApproximateCreationDateTime: writtenAt,
    NewImage: marshall(NewImage) as never,
    ...(OldImage ? { OldImage: marshall(OldImage) as never } : {}),
  },
});

describe('notificationEventOf', () => {
  it('should take a new answer, question or lesson', () => {
    expect(
      notificationEventOf(
        record('INSERT', {
          type: 'Answer',
          id: answerId,
          lessonId,
          questionId,
        }),
      ),
    ).toEqual({ kind: 'answer', lessonId, questionId, answerId });
    expect(
      notificationEventOf(
        record('INSERT', { type: 'Question', id: questionId, lessonId }),
      ),
    ).toEqual({ kind: 'question', lessonId, questionId });
    expect(
      notificationEventOf(
        record('INSERT', { type: 'LessonContent', id: lessonId, courseId }),
      ),
    ).toEqual({
      kind: 'lesson',
      courseId,
      lessonId,
      occurredAt: '2026-11-12T12:00:00.000Z',
    });
  });

  it('should take a course just archived, at the time it was written', () => {
    expect(
      notificationEventOf(
        record(
          'MODIFY',
          { type: 'Course', id: courseId, status: 'ARCHIVED' },
          { type: 'Course', id: courseId, status: 'PUBLISHED' },
        ),
      ),
    ).toEqual({
      kind: 'archived',
      courseId,
      occurredAt: '2026-11-12T12:00:00.000Z',
    });
  });

  it.each([
    [
      'an answer counted',
      record('MODIFY', { type: 'Question', id: questionId, lessonId }),
    ],
    [
      'a lesson renamed',
      record('MODIFY', { type: 'Lesson', id: lessonId, courseId }),
    ],
    [
      'a lesson moved to another module',
      record('INSERT', { type: 'Lesson', id: lessonId, courseId }),
    ],
    ['another item', record('INSERT', { type: 'Module', id: id(), courseId })],
  ])('should pass over %s', (_, change) => {
    expect(notificationEventOf(change)).toBeNull();
  });

  it('should take an export that turns ready, at the time it was written', () => {
    const exportId = id();
    const exportItem = (status: string) => ({
      type: 'StudentExport',
      id: exportId,
      status,
    });

    expect(
      notificationEventOf(
        record('MODIFY', exportItem('READY'), exportItem('PENDING')),
      ),
    ).toEqual({
      kind: 'export-ready',
      exportId,
      occurredAt: '2026-11-12T12:00:00.000Z',
    });
    expect(
      notificationEventOf(
        record('MODIFY', exportItem('FAILED'), exportItem('PENDING')),
      ),
    ).toBeNull();
    expect(
      notificationEventOf(
        record('MODIFY', exportItem('READY'), exportItem('READY')),
      ),
    ).toBeNull();
    expect(
      notificationEventOf(record('INSERT', exportItem('PENDING'))),
    ).toBeNull();
  });
});
