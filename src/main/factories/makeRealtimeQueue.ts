import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';
import { SqsRealtimeQueue } from '@infra/gateways/realtime/SqsRealtimeQueue';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeRealtimeQueue(): RealtimeQueue {
  const appConfig = makeAppConfig();

  return new SqsRealtimeQueue(appConfig);
}
