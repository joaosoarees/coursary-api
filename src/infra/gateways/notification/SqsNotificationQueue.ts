import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import { sqsClient } from '@infra/clients/sqsClient';
import type { AppConfig } from '@shared/config/AppConfig';

// A standard queue: a notification is stored once per event and person, so a repeat writes nothing.
export class SqsNotificationQueue implements NotificationQueue {
  static readonly batchSize = 10;

  constructor(private readonly config: AppConfig) {}

  async enqueue(requests: NotificationQueue.Request[]): Promise<void> {
    for (let i = 0; i < requests.length; i += SqsNotificationQueue.batchSize) {
      const batch = requests.slice(i, i + SqsNotificationQueue.batchSize);
      const command = new SendMessageBatchCommand({
        QueueUrl: this.config.notificationQueueUrl,
        Entries: batch.map((request, index) => ({
          Id: String(index),
          MessageBody: JSON.stringify(request),
        })),
      });
      const { Failed = [] } = await sqsClient.send(command);

      if (Failed.length > 0) {
        throw new Error(
          `The notification queue refused ${String(Failed.length)} messages: ${Failed.map((f) => f.Code).join(', ')}`,
        );
      }
    }
  }
}
