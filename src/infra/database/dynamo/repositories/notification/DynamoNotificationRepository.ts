import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { Account } from '@application/entities/account/Account';
import type { Notification } from '@application/entities/notification/Notification';
import type { NotificationRepository } from '@application/repositories/notification/NotificationRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { NotificationItem } from '@infra/database/dynamo/items/notification/NotificationItem';
import { nowInSeconds } from '@infra/database/dynamo/ttl';
import type { AppConfig } from '@shared/config/AppConfig';

const IN_FLIGHT = 10;

export class DynamoNotificationRepository implements NotificationRepository {
  constructor(private readonly config: AppConfig) {}

  saveIfNew(notification: Notification): Promise<boolean> {
    const command = new PutCommand({
      TableName: this.config.mainTableName,
      Item: NotificationItem.fromEntity(notification).toItem(),
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    return this.unlessMissing(() => dynamoClient.send(command));
  }

  markRead(
    accountId: Account.Id,
    id: Notification.Id,
    now: Date,
  ): Promise<boolean> {
    const command = new UpdateCommand({
      TableName: this.config.mainTableName,
      Key: {
        PK: NotificationItem.getPK(accountId),
        SK: NotificationItem.getSK(id),
      },
      UpdateExpression:
        'SET readAt = if_not_exists(readAt, :now) REMOVE GSI1PK, GSI1SK',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':now': now.toISOString() },
    });

    return this.unlessMissing(() => dynamoClient.send(command));
  }

  async markAllRead(
    accountId: Account.Id,
    now: Date,
    max: number,
  ): Promise<number> {
    const ids = await this.unreadIds(accountId, now, max);
    let marked = 0;

    const worker = async () => {
      for (let id = ids.shift(); id; id = ids.shift()) {
        if (await this.markRead(accountId, id, now)) {
          marked += 1;
        }
      }
    };

    await Promise.all(Array.from({ length: IN_FLIGHT }, worker));

    return marked;
  }

  async countUnread(
    accountId: Account.Id,
    now: Date,
    cap: number,
  ): Promise<number> {
    const { Count = 0 } = await dynamoClient.send(
      new QueryCommand({
        ...this.unreadQuery(accountId, now),
        Select: 'COUNT',
        Limit: cap,
      }),
    );

    return Count;
  }

  private async unreadIds(
    accountId: Account.Id,
    now: Date,
    max: number,
  ): Promise<Notification.Id[]> {
    const ids: Notification.Id[] = [];
    let startKey: Record<string, unknown> | undefined;

    do {
      const { Items = [], LastEvaluatedKey } = await dynamoClient.send(
        new QueryCommand({
          ...this.unreadQuery(accountId, now),
          ProjectionExpression: 'id',
          Limit: max - ids.length,
          ExclusiveStartKey: startKey,
        }),
      );

      for (const item of Items) {
        ids.push((item as Pick<NotificationItem.ItemType, 'id'>).id);
      }

      startKey = LastEvaluatedKey;
    } while (startKey && ids.length < max);

    return ids;
  }

  // TTL removes an expired notification days later: until then it is filtered out. Newest first,
  // because Limit counts before the filter: the expired ones, the oldest, come last.
  private unreadQuery(accountId: Account.Id, now: Date) {
    return {
      TableName: this.config.mainTableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :unread',
      ScanIndexForward: false,
      FilterExpression: 'expiresAt > :now',
      ExpressionAttributeValues: {
        ':unread': NotificationItem.getGSI1PK(accountId),
        ':now': nowInSeconds(now.getTime()),
      },
    };
  }

  private async unlessMissing(write: () => Promise<unknown>): Promise<boolean> {
    try {
      await write();

      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return false;
      }

      throw error;
    }
  }
}
