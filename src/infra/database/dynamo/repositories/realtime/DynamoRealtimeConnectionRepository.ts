import {
  DeleteCommand,
  paginateQuery,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

import type { Account } from '@application/entities/account/Account';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeConnectionRepository } from '@application/repositories/realtime/RealtimeConnectionRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { RealtimeConnectionItem } from '@infra/database/dynamo/items/realtime/RealtimeConnectionItem';
import { nowInSeconds } from '@infra/database/dynamo/ttl';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoRealtimeConnectionRepository implements RealtimeConnectionRepository {
  constructor(private readonly config: AppConfig) {}

  async save(connection: RealtimeConnection): Promise<void> {
    const command = new PutCommand({
      TableName: this.config.mainTableName,
      Item: RealtimeConnectionItem.fromEntity(connection).toItem(),
    });

    await dynamoClient.send(command);
  }

  async remove(id: RealtimeConnection.Id): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.config.mainTableName,
      Key: {
        PK: RealtimeConnectionItem.getPK(id),
        SK: RealtimeConnectionItem.getSK(id),
      },
    });

    await dynamoClient.send(command);
  }

  findByLesson(lessonId: Lesson.Id, now: Date): Promise<RealtimeConnection[]> {
    return this.queryLive(
      'GSI1',
      'GSI1PK',
      RealtimeConnectionItem.getGSI1PK(lessonId),
      now,
    );
  }

  findByAccount(
    accountId: Account.Id,
    now: Date,
  ): Promise<RealtimeConnection[]> {
    return this.queryLive(
      'GSI2',
      'GSI2PK',
      RealtimeConnectionItem.getGSI2PK(accountId),
      now,
    );
  }

  private async queryLive(
    indexName: 'GSI1' | 'GSI2',
    keyName: 'GSI1PK' | 'GSI2PK',
    key: string,
    now: Date,
  ): Promise<RealtimeConnection[]> {
    const pages = paginateQuery(
      { client: dynamoClient },
      {
        TableName: this.config.mainTableName,
        IndexName: indexName,
        KeyConditionExpression: '#key = :key',
        // An expired connection stays in the table until TTL gets to it, days later.
        FilterExpression: 'expiresAt > :now',
        ExpressionAttributeNames: { '#key': keyName },
        ExpressionAttributeValues: {
          ':key': key,
          ':now': nowInSeconds(now.getTime()),
        },
      },
    );
    const connections: RealtimeConnection[] = [];

    for await (const { Items = [] } of pages) {
      for (const item of Items) {
        connections.push(
          RealtimeConnectionItem.toEntity(
            item as RealtimeConnectionItem.ItemType,
          ),
        );
      }
    }

    return connections;
  }
}
