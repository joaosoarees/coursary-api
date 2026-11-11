import { ConsumeRealtimeTicketUseCase } from '@application/usecases/realtime/ConsumeRealtimeTicketUseCase';
import { websocketAuthorizerAdapter } from '@main/adapters/websocketAuthorizerAdapter';
import { makeRealtimeTicketRepository } from '@main/factories/makeRealtimeTicketRepository';

const ticketsRepository = makeRealtimeTicketRepository();
const consumeTicketUseCase = new ConsumeRealtimeTicketUseCase(
  ticketsRepository,
);

export const handler = websocketAuthorizerAdapter(consumeTicketUseCase);
