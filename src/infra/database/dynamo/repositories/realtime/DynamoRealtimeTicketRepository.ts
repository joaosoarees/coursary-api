import { DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

import type { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';
import type { RealtimeTicketRepository } from '@application/repositories/realtime/RealtimeTicketRepository';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { RealtimeTicketItem } from '@infra/database/dynamo/items/realtime/RealtimeTicketItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoRealtimeTicketRepository implements RealtimeTicketRepository {
  constructor(private readonly config: AppConfig) {}

  async save(ticket: RealtimeTicket): Promise<void> {
    const command = new PutCommand({
      TableName: this.config.mainTableName,
      Item: RealtimeTicketItem.fromEntity(ticket).toItem(),
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    await dynamoClient.send(command);
  }

  // One atomic delete: of two connects with the same ticket, only one gets its attributes back.
  async consume(hash: string): Promise<RealtimeTicket | null> {
    const command = new DeleteCommand({
      TableName: this.config.mainTableName,
      Key: {
        PK: RealtimeTicketItem.getPK(hash),
        SK: RealtimeTicketItem.getSK(hash),
      },
      ReturnValues: 'ALL_OLD',
    });

    const { Attributes } = await dynamoClient.send(command);

    return Attributes
      ? RealtimeTicketItem.toEntity(Attributes as RealtimeTicketItem.ItemType)
      : null;
  }
}
