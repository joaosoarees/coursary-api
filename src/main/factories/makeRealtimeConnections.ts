import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';
import { ApiGatewayRealtimeConnections } from '@infra/gateways/realtime/ApiGatewayRealtimeConnections';
import { makeRealtimeChannel } from '@main/factories/makeRealtimeChannel';
import { makeRealtimeConnectionRepository } from '@main/factories/makeRealtimeConnectionRepository';

export function makeRealtimeConnections(): RealtimeConnections {
  return new ApiGatewayRealtimeConnections(
    makeRealtimeConnectionRepository(),
    makeRealtimeChannel(),
  );
}
