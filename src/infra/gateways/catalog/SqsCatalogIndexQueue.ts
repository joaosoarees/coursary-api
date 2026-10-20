import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import type { CatalogIndexQueue } from '@application/gateways/catalog/CatalogIndexQueue';
import { sqsClient } from '@infra/clients/sqsClient';
import type { AppConfig } from '@shared/config/AppConfig';

export class SqsCatalogIndexQueue implements CatalogIndexQueue {
  static readonly batchSize = 10;

  constructor(private readonly config: AppConfig) {}

  // One batch after another, so the messages of a course keep their order.
  async enqueue(requests: CatalogIndexQueue.Request[]): Promise<void> {
    for (let i = 0; i < requests.length; i += SqsCatalogIndexQueue.batchSize) {
      const batch = requests.slice(i, i + SqsCatalogIndexQueue.batchSize);
      const { Failed = [] } = await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: this.config.catalogIndexQueueUrl,
          Entries: batch.map((request, index) => ({
            Id: String(index),
            MessageBody: JSON.stringify({ courseId: request.courseId }),
            MessageGroupId: request.courseId,
            MessageDeduplicationId: request.deduplicationId,
          })),
        }),
      );

      if (Failed.length > 0) {
        throw new Error(
          `The index queue refused ${String(Failed.length)} messages: ${Failed.map((f) => f.Code).join(', ')}`,
        );
      }
    }
  }
}
