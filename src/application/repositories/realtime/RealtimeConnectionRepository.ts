import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';

export interface RealtimeConnectionRepository {
  save: (connection: RealtimeConnection) => Promise<void>;

  // A connection already gone is not an error: $disconnect is best effort and may come twice.
  remove: (id: RealtimeConnection.Id) => Promise<void>;
}
