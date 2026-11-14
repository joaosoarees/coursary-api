import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { StudentExport } from '@application/entities/export/StudentExport';
import { Notification } from '@application/entities/notification/Notification';
import { NotificationSummary } from '@application/queries/notification/NotificationSummary';

const owner = Account.create({ name: 'Ana', email: 'a@example.com' });
const course = Course.create({ instructor: owner, title: 'DynamoDB' });

describe('NotificationSummary', () => {
  it('should show the export of an export-ready notice', () => {
    const exportId = StudentExport.toId('2HZXtsyCWqKbYadQSGc1G5hSJPo');
    const notification = Notification.create({
      accountId: owner.id,
      kind: 'export-ready',
      courseId: course.id,
      courseTitle: 'DynamoDB',
      lessonId: undefined,
      lessonTitle: undefined,
      questionId: undefined,
      actorName: undefined,
      byInstructor: false,
      exportId,
      sourceId: exportId,
      occurredAt: new Date('2026-11-13T12:00:00.000Z'),
    });

    expect(NotificationSummary.fromNotification(notification)).toMatchObject({
      kind: 'export-ready',
      courseTitle: 'DynamoDB',
      exportId,
      read: false,
    });
  });
});
