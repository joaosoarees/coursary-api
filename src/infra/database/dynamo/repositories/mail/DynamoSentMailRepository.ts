import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { SentMailRepository } from '@application/repositories/mail/SentMailRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { SentMailItem } from '@infra/database/dynamo/items/mail/SentMailItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoSentMailRepository implements SentMailRepository {
  constructor(private readonly config: AppConfig) {}

  // A new claim, or one whose lease ran out: never one already sent.
  async claim({
    accountId,
    kind,
    ref,
    now,
    leaseSeconds,
  }: SentMailRepository.Claim): Promise<SentMailRepository.Claimed> {
    const nowSeconds = Math.floor(now.getTime() / 1000);

    try {
      await dynamoClient.send(
        new UpdateCommand({
          TableName: this.config.mainTableName,
          Key: {
            PK: SentMailItem.getPK(accountId),
            SK: SentMailItem.getSK(kind, ref),
          },
          UpdateExpression: `SET #type = :type, accountId = :accountId, kind = :kind, #status = :sending, leaseUntil = :leaseUntil${ref ? ', #ref = :ref' : ''} ADD attempts :one`,
          ConditionExpression:
            'attribute_not_exists(PK) OR (#status = :sending AND leaseUntil < :now)',
          ExpressionAttributeNames: {
            '#type': 'type',
            '#status': 'status',
            ...(ref ? { '#ref': 'ref' } : {}),
          },
          ExpressionAttributeValues: {
            ...(ref ? { ':ref': ref } : {}),
            ':type': SentMailItem.type,
            ':accountId': accountId,
            ':kind': kind,
            ':sending': 'SENDING',
            ':leaseUntil': nowSeconds + leaseSeconds,
            ':now': nowSeconds,
            ':one': 1,
          },
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
        }),
      );

      return 'claimed';
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return error.Item?.status?.S === 'SENT' ? 'sent' : 'busy';
      }

      throw error;
    }
  }

  async markSent({
    accountId,
    kind,
    ref,
    sesMessageId,
    sentAt,
  }: SentMailRepository.Sent): Promise<void> {
    try {
      await dynamoClient.send(
        new UpdateCommand({
          TableName: this.config.mainTableName,
          Key: {
            PK: SentMailItem.getPK(accountId),
            SK: SentMailItem.getSK(kind, ref),
          },
          UpdateExpression:
            'SET #status = :sent, sesMessageId = :messageId, sentAt = :sentAt REMOVE leaseUntil',
          ConditionExpression: '#status = :sending',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':sent': 'SENT',
            ':sending': 'SENDING',
            ':messageId': sesMessageId,
            ':sentAt': sentAt.toISOString(),
          },
        }),
      );
    } catch (error) {
      // An attempt that took over the claim marked it first: it is sent either way.
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }
}
