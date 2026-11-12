import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Notification } from '@application/entities/notification/Notification';

const student = Account.create({ name: 'Bia', email: 'bia@example.com' });
const other = Account.create({ name: 'Caio', email: 'caio@example.com' });
const course = Course.create({ instructor: student, title: 'DynamoDB' });

const notify = (
  accountId: Account.Id,
  sourceId = 'answer-1',
  occurredAt = new Date('2026-11-12T12:00:00.000Z'),
) =>
  Notification.create({
    accountId,
    kind: 'answer',
    courseId: course.id,
    courseTitle: course.title,
    lessonId: undefined,
    lessonTitle: undefined,
    questionId: undefined,
    actorName: 'Ana',
    byInstructor: true,
    sourceId,
    occurredAt,
  });

describe('Notification', () => {
  it('should give the same event for the same person the same id', () => {
    expect(notify(student.id).id).toBe(notify(student.id).id);
    expect(notify(other.id).id).not.toBe(notify(student.id).id);
    expect(notify(student.id, 'answer-2').id).not.toBe(notify(student.id).id);
  });

  it('should order ids by when the event happened', () => {
    const earlier = notify(student.id, 'b', new Date('2026-11-12T12:00:00Z'));
    const later = notify(student.id, 'a', new Date('2026-11-12T12:00:01Z'));

    expect(later.id > earlier.id).toBe(true);
  });

  it('should start unread and expire after ninety days', () => {
    const notification = notify(student.id);

    expect(notification.isRead()).toBe(false);
    expect(notification.expiresAt).toEqual(
      new Date('2027-02-10T12:00:00.000Z'),
    );
  });
});
