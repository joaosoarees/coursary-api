import { DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeConnectionRepository } from '@application/repositories/realtime/RealtimeConnectionRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { RealtimeConnectionItem } from '@infra/database/dynamo/items/realtime/RealtimeConnectionItem';
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
}
