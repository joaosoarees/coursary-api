import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { notificationMessageSchema } from '@main/functions/notification/notificationMessageSchema';

const id = anAccountId();
const occurredAt = '2026-11-12T12:00:00.000Z';

describe('notificationMessageSchema', () => {
  it.each([
    [{ kind: 'answer', lessonId: id, questionId: id, answerId: id }],
    [{ kind: 'question', lessonId: id, questionId: id }],
    [{ kind: 'lesson', courseId: id, lessonId: id, occurredAt }],
    [{ kind: 'archived', courseId: id, occurredAt, cursor: 'eyJQSyI6IngifQ' }],
  ])('should read %o', (message) => {
    expect(notificationMessageSchema.parse(message)).toEqual(message);
  });

  it.each([
    [{ kind: 'review', courseId: id }],
    [{ kind: 'answer', lessonId: id, questionId: id }],
    [{ kind: 'lesson', courseId: id, lessonId: id }],
    [{ kind: 'archived', courseId: id, occurredAt: 'yesterday' }],
    [{ kind: 'archived', courseId: id, occurredAt, cursor: '' }],
  ])('should refuse %o', (message) => {
    expect(notificationMessageSchema.safeParse(message).success).toBe(false);
  });
});
