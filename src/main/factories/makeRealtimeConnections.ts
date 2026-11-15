import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';
import { QueuedRealtimeConnections } from '@infra/gateways/realtime/QueuedRealtimeConnections';
import { makeRealtimeQueue } from '@main/factories/makeRealtimeQueue';

export function makeRealtimeConnections(): RealtimeConnections {
  return new QueuedRealtimeConnections(makeRealtimeQueue());
}
