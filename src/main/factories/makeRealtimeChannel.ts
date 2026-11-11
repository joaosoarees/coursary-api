import type { RealtimeChannel } from '@application/gateways/realtime/RealtimeChannel';
import { ApiGatewayRealtimeChannel } from '@infra/gateways/realtime/ApiGatewayRealtimeChannel';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeRealtimeChannel(): RealtimeChannel {
  const appConfig = makeAppConfig();

  return new ApiGatewayRealtimeChannel(appConfig);
}
