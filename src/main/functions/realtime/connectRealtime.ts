import { OpenRealtimeConnectionUseCase } from '@application/usecases/realtime/OpenRealtimeConnectionUseCase';
import { websocketConnectAdapter } from '@main/adapters/websocketConnectionAdapter';
import { makeRealtimeConnectionRepository } from '@main/factories/makeRealtimeConnectionRepository';

const connectionsRepository = makeRealtimeConnectionRepository();
const openConnectionUseCase = new OpenRealtimeConnectionUseCase(
  connectionsRepository,
);

export const handler = websocketConnectAdapter(openConnectionUseCase);
