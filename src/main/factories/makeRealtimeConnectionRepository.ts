import type { RealtimeConnectionRepository } from '@application/repositories/realtime/RealtimeConnectionRepository';
import { DynamoRealtimeConnectionRepository } from '@infra/database/dynamo/repositories/realtime/DynamoRealtimeConnectionRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeRealtimeConnectionRepository(): RealtimeConnectionRepository {
  const appConfig = makeAppConfig();

  return new DynamoRealtimeConnectionRepository(appConfig);
}
