import { GetCommand } from '@aws-sdk/lib-dynamodb';

import { questionWorld } from '@tests/support/questionWorld';

import { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoRealtimeConnectionRepository } from '@infra/database/dynamo/repositories/realtime/DynamoRealtimeConnectionRepository';
import { DynamoRealtimeTicketRepository } from '@infra/database/dynamo/repositories/realtime/DynamoRealtimeTicketRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();

export async function realtimeWorld() {
  const world = await questionWorld();
  const tickets = new DynamoRealtimeTicketRepository(config);
  const connections = new DynamoRealtimeConnectionRepository(config);

  const storedTicket = async (token: string) => {
    const hash = RealtimeTicket.hashToken(token);
    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: { PK: `TICKET#${hash}`, SK: `TICKET#${hash}` },
      }),
    );

    return Item;
  };

  const storedConnection = async (id: string) => {
    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: { PK: `CONNECTION#${id}`, SK: `CONNECTION#${id}` },
      }),
    );

    return Item;
  };

  return {
    ...world,
    tickets,
    connections,
    storedTicket,
    storedConnection,
  };
}
