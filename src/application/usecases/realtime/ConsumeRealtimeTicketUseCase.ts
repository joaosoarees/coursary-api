import { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';
import type { RealtimeTicketRepository } from '@application/repositories/realtime/RealtimeTicketRepository';

export class ConsumeRealtimeTicketUseCase {
  constructor(private readonly ticketsRepository: RealtimeTicketRepository) {}

  // null refuses the connection: an unknown, used or expired ticket alike.
  async execute({
    token,
    now = new Date(),
  }: ConsumeRealtimeTicketUseCase.Input): Promise<RealtimeTicket | null> {
    const ticket = await this.ticketsRepository.consume(
      RealtimeTicket.hashToken(token),
    );

    return ticket && !ticket.isExpiredAt(now) ? ticket : null;
  }
}

export namespace ConsumeRealtimeTicketUseCase {
  export interface Input {
    token: string;
    now?: Date;
  }
}
