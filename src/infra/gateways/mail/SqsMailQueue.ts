import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import type { MailQueue } from '@application/gateways/mail/MailQueue';
import { sqsClient } from '@infra/clients/sqsClient';
import type { AppConfig } from '@shared/config/AppConfig';

// A standard queue: the consumer's claim makes a repeated message harmless (Q350).
export class SqsMailQueue implements MailQueue {
  static readonly batchSize = 10;

  constructor(private readonly config: AppConfig) {}

  async enqueue(requests: MailQueue.Request[]): Promise<void> {
    for (let i = 0; i < requests.length; i += SqsMailQueue.batchSize) {
      const batch = requests.slice(i, i + SqsMailQueue.batchSize);
      const { Failed = [] } = await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: this.config.mailQueueUrl,
          Entries: batch.map((request, index) => ({
            Id: String(index),
            MessageBody: JSON.stringify(request),
          })),
        }),
      );

      if (Failed.length > 0) {
        throw new Error(
          `The mail queue refused ${String(Failed.length)} messages: ${Failed.map((f) => f.Code).join(', ')}`,
        );
      }
    }
  }
}
