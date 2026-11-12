import type { DynamoDBStreamEvent } from 'aws-lambda';

import type { CognitoCleanupQueue } from '@application/gateways/auth/CognitoCleanupQueue';
import type { CatalogIndexQueue } from '@application/gateways/catalog/CatalogIndexQueue';
import type { CourseDeletionQueue } from '@application/gateways/course/CourseDeletionQueue';
import type { StudentExportQueue } from '@application/gateways/export/StudentExportQueue';
import type { MailQueue } from '@application/gateways/mail/MailQueue';
import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';
import { archivedCourseOf } from '@infra/database/dynamo/stream/archivedCourses';
import { courseToIndex } from '@infra/database/dynamo/stream/catalogChanges';
import { confirmedAccountOf } from '@infra/database/dynamo/stream/confirmedAccounts';
import { deletedCourseOf } from '@infra/database/dynamo/stream/deletedCourses';
import { expiredSignUpOf } from '@infra/database/dynamo/stream/expiredSignUps';
import { lessonChangeOf } from '@infra/database/dynamo/stream/lessonChanges';
import { notificationEventOf } from '@infra/database/dynamo/stream/notificationEvents';
import { requestedExportOf } from '@infra/database/dynamo/stream/requestedExports';

// The one reader of the table stream; each consumer gets its own queue.
export function dynamoStreamRouter(
  catalogIndexQueue: CatalogIndexQueue,
  cognitoCleanupQueue: CognitoCleanupQueue,
  mailQueue: MailQueue,
  courseDeletionQueue: CourseDeletionQueue,
  studentExportQueue: StudentExportQueue,
  realtimeQueue: RealtimeQueue,
  notificationQueue: NotificationQueue,
) {
  return async (event: DynamoDBStreamEvent): Promise<void> => {
    const courses = event.Records.flatMap((record) => {
      const courseId = courseToIndex(record);

      if (!courseId) {
        return [];
      }

      const deduplicationId = record.eventID ?? record.dynamodb?.SequenceNumber;

      if (!deduplicationId) {
        throw new Error(`A change of course ${courseId} has no event id.`);
      }

      return [{ courseId, deduplicationId }];
    });
    const expiredSignUps = event.Records.flatMap((record) => {
      const signUp = expiredSignUpOf(record);

      return signUp ? [signUp] : [];
    });

    const mails = event.Records.flatMap((record): MailQueue.Request[] => {
      const accountId = confirmedAccountOf(record);
      const courseId = archivedCourseOf(record);

      if (accountId) {
        return [{ kind: 'welcome', accountId }];
      }

      return courseId ? [{ kind: 'course-archived-fanout', courseId }] : [];
    });

    const deletions = event.Records.flatMap((record) => {
      const courseId = deletedCourseOf(record);

      return courseId ? [courseId] : [];
    });

    const studentExports = event.Records.flatMap((record) => {
      const exportId = requestedExportOf(record);

      return exportId ? [exportId] : [];
    });

    const lessons = new Map<string, RealtimeQueue.LessonChange>();

    for (const record of event.Records) {
      const change = lessonChangeOf(record);

      if (!change) {
        continue;
      }

      const lesson = lessons.get(change.lessonId) ?? {
        lessonId: change.lessonId,
        questionIds: [],
        listChanged: false,
      };

      if (!change.questionId) {
        lesson.listChanged = true;
      } else if (!lesson.questionIds.includes(change.questionId)) {
        lesson.questionIds.push(change.questionId);
      }

      lessons.set(change.lessonId, lesson);
    }

    const notifications = event.Records.flatMap((record) => {
      const request = notificationEventOf(record);

      return request ? [request] : [];
    });

    await Promise.all([
      catalogIndexQueue.enqueue(courses),
      cognitoCleanupQueue.enqueue(expiredSignUps),
      mailQueue.enqueue(mails),
      courseDeletionQueue.enqueue(deletions),
      studentExportQueue.enqueue(studentExports),
      realtimeQueue.enqueue([...lessons.values()]),
      notificationQueue.enqueue(notifications),
    ]);
  };
}
