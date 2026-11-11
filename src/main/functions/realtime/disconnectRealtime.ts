import { CloseRealtimeConnectionUseCase } from '@application/usecases/realtime/CloseRealtimeConnectionUseCase';
import { websocketDisconnectAdapter } from '@main/adapters/websocketConnectionAdapter';
import { makeRealtimeConnectionRepository } from '@main/factories/makeRealtimeConnectionRepository';

const connectionsRepository = makeRealtimeConnectionRepository();
const closeConnectionUseCase = new CloseRealtimeConnectionUseCase(
  connectionsRepository,
);

export const handler = websocketDisconnectAdapter(closeConnectionUseCase);
