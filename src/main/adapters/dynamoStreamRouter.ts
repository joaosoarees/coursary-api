import type { DynamoDBStreamEvent } from 'aws-lambda';

import type { CognitoCleanupQueue } from '@application/gateways/auth/CognitoCleanupQueue';
import type { CatalogIndexQueue } from '@application/gateways/catalog/CatalogIndexQueue';
import type { MailQueue } from '@application/gateways/mail/MailQueue';
import { archivedCourseOf } from '@infra/database/dynamo/stream/archivedCourses';
import { courseToIndex } from '@infra/database/dynamo/stream/catalogChanges';
import { confirmedAccountOf } from '@infra/database/dynamo/stream/confirmedAccounts';
import { expiredSignUpOf } from '@infra/database/dynamo/stream/expiredSignUps';

// The one reader of the table stream; each consumer gets its own queue (Q302).
export function dynamoStreamRouter(
  catalogIndexQueue: CatalogIndexQueue,
  cognitoCleanupQueue: CognitoCleanupQueue,
  mailQueue: MailQueue,
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

    await Promise.all([
      catalogIndexQueue.enqueue(courses),
      cognitoCleanupQueue.enqueue(expiredSignUps),
      mailQueue.enqueue(mails),
    ]);
  };
}
