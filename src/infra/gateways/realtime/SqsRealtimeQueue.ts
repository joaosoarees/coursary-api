import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';
import { sqsClient } from '@infra/clients/sqsClient';
import type { AppConfig } from '@shared/config/AppConfig';

// A standard queue: a repeated or late message only makes the clients reload once more.
export class SqsRealtimeQueue implements RealtimeQueue {
  static readonly batchSize = 10;

  constructor(private readonly config: AppConfig) {}

  async enqueue(changes: RealtimeQueue.Change[]): Promise<void> {
    for (let i = 0; i < changes.length; i += SqsRealtimeQueue.batchSize) {
      const batch = changes.slice(i, i + SqsRealtimeQueue.batchSize);
      const command = new SendMessageBatchCommand({
        QueueUrl: this.config.realtimeQueueUrl,
        Entries: batch.map((change, index) => ({
          Id: String(index),
          MessageBody: JSON.stringify(change),
        })),
      });
      const { Failed = [] } = await sqsClient.send(command);

      if (Failed.length > 0) {
        throw new Error(
          `The realtime queue refused ${String(Failed.length)} messages: ${Failed.map((f) => f.Code).join(', ')}`,
        );
      }
    }
  }
}
