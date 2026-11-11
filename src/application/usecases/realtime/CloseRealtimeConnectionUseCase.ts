import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeConnectionRepository } from '@application/repositories/realtime/RealtimeConnectionRepository';

export class CloseRealtimeConnectionUseCase {
  constructor(
    private readonly connectionsRepository: RealtimeConnectionRepository,
  ) {}

  async execute({ id }: { id: RealtimeConnection.Id }): Promise<void> {
    await this.connectionsRepository.remove(id);
  }
}
