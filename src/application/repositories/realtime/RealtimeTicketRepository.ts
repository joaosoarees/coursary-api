import type { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';

export interface RealtimeTicketRepository {
  save: (ticket: RealtimeTicket) => Promise<void>;
}
