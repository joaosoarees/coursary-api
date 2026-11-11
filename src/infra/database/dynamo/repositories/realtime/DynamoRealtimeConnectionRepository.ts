import {
  DeleteCommand,
  paginateQuery,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

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

  async findByLesson(
    lessonId: Lesson.Id,
    now: Date,
  ): Promise<RealtimeConnection[]> {
    const pages = paginateQuery(
      { client: dynamoClient },
      {
        TableName: this.config.mainTableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :lesson',
        // An expired connection stays in the table until TTL gets to it, days later.
        FilterExpression: 'expiresAt > :now',
        ExpressionAttributeValues: {
          ':lesson': RealtimeConnectionItem.getGSI1PK(lessonId),
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
