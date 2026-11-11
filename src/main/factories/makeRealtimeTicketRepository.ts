import type { RealtimeTicketRepository } from '@application/repositories/realtime/RealtimeTicketRepository';
import { DynamoRealtimeTicketRepository } from '@infra/database/dynamo/repositories/realtime/DynamoRealtimeTicketRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeRealtimeTicketRepository(): RealtimeTicketRepository {
  const appConfig = makeAppConfig();

  return new DynamoRealtimeTicketRepository(appConfig);
}
