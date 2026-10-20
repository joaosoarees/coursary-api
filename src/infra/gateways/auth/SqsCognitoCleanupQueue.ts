import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';

import type { AuthGateway } from '@application/gateways/auth/AuthGateway';
import type { CognitoCleanupQueue } from '@application/gateways/auth/CognitoCleanupQueue';
import { sqsClient } from '@infra/clients/sqsClient';
import type { AppConfig } from '@shared/config/AppConfig';

// A standard queue: deleting a user twice changes nothing, so order and duplicates do not matter.
export class SqsCognitoCleanupQueue implements CognitoCleanupQueue {
  static readonly batchSize = 10;

  constructor(private readonly config: AppConfig) {}

  async enqueue(signUps: AuthGateway.ExpiredSignUp[]): Promise<void> {
    for (let i = 0; i < signUps.length; i += SqsCognitoCleanupQueue.batchSize) {
      const batch = signUps.slice(i, i + SqsCognitoCleanupQueue.batchSize);
      const { Failed = [] } = await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: this.config.cognitoCleanupQueueUrl,
          Entries: batch.map((signUp, index) => ({
            Id: String(index),
            MessageBody: JSON.stringify(signUp),
          })),
        }),
      );

      if (Failed.length > 0) {
        throw new Error(
          `The cleanup queue refused ${String(Failed.length)} messages: ${Failed.map((f) => f.Code).join(', ')}`,
        );
      }
    }
  }
}
