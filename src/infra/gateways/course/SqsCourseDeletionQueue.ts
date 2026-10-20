import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import type { Course } from '@application/entities/course/Course';
import type { CourseDeletionQueue } from '@application/gateways/course/CourseDeletionQueue';
import { sqsClient } from '@infra/clients/sqsClient';
import type { AppConfig } from '@shared/config/AppConfig';

// A standard queue: the job only finds less to delete when a message repeats.
export class SqsCourseDeletionQueue implements CourseDeletionQueue {
  static readonly batchSize = 10;

  constructor(private readonly config: AppConfig) {}

  async enqueue(courseIds: Course.Id[]): Promise<void> {
    for (
      let i = 0;
      i < courseIds.length;
      i += SqsCourseDeletionQueue.batchSize
    ) {
      const batch = courseIds.slice(i, i + SqsCourseDeletionQueue.batchSize);
      const { Failed = [] } = await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: this.config.courseDeletionQueueUrl,
          Entries: batch.map((courseId, index) => ({
            Id: String(index),
            MessageBody: JSON.stringify({ courseId }),
          })),
        }),
      );

      if (Failed.length > 0) {
        throw new Error(
          `The course deletion queue refused ${String(Failed.length)} messages: ${Failed.map((f) => f.Code).join(', ')}`,
        );
      }
    }
  }
}
