import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { Notification } from '@application/entities/notification/Notification';
import { Lesson } from '@application/entities/outline/Lesson';
import { NotificationItem } from '@infra/database/dynamo/items/notification/NotificationItem';

const student = Account.create({ name: 'Bia', email: 'b@example.com' });
const course = Course.create({ instructor: student, title: 'DynamoDB' });

const lessonNotice = () =>
  Notification.create({
    accountId: student.id,
    kind: 'lesson',
    courseId: course.id,
    courseTitle: 'DynamoDB',
    lessonId: Lesson.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo'),
    lessonTitle: 'Chaves',
    questionId: undefined,
    actorName: undefined,
    byInstructor: false,
    sourceId: 'lesson-1',
    occurredAt: new Date('2026-11-12T12:00:00.000Z'),
  });

describe('NotificationItem', () => {
  it('should keep an unread notification in the inbox and in the unread index', () => {
    const notification = lessonNotice();

    const item = NotificationItem.fromEntity(notification).toItem();

    expect(item).toMatchObject({
      PK: `INBOX#${student.id}`,
      SK: `NOTIFICATION#${notification.id}`,
      GSI1PK: `UNREAD#${student.id}`,
      GSI1SK: `NOTIFICATION#${notification.id}`,
      type: 'Notification',
      expiresAt: Date.parse('2027-02-10T12:00:00.000Z') / 1000,
    });
    expect(item).not.toHaveProperty('questionId');
    expect(NotificationItem.toEntity(item)).toEqual(notification);
  });

  it('should leave a read notification out of the unread index', () => {
    const notification = lessonNotice();
    notification.readAt = new Date('2026-11-12T13:00:00.000Z');

    const item = NotificationItem.fromEntity(notification).toItem();

    expect(item).not.toHaveProperty('GSI1PK');
    expect(item.readAt).toBe('2026-11-12T13:00:00.000Z');
    expect(NotificationItem.toEntity(item)).toEqual(notification);
  });
});
