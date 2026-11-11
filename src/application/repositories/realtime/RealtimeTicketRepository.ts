import type { RealtimeTicket } from '@application/entities/realtime/RealtimeTicket';

export interface RealtimeTicketRepository {
  save: (ticket: RealtimeTicket) => Promise<void>;

  // Removes it in the same call that reads it: a second use finds nothing.
  consume: (hash: string) => Promise<RealtimeTicket | null>;
}
