import type { Account } from '@application/entities/account/Account';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeLesson } from '@application/entities/realtime/RealtimeLesson';
import type { RealtimeConnectionRepository } from '@application/repositories/realtime/RealtimeConnectionRepository';

export class OpenRealtimeConnectionUseCase {
  constructor(
    private readonly connectionsRepository: RealtimeConnectionRepository,
  ) {}

  // The account and the lesson, when there is one, come from the consumed ticket, never from the client.
  async execute(input: OpenRealtimeConnectionUseCase.Input): Promise<void> {
    await this.connectionsRepository.save(RealtimeConnection.open(input));
  }
}

export namespace OpenRealtimeConnectionUseCase {
  export interface Input {
    id: RealtimeConnection.Id;
    apiId: string;
    accountId: Account.Id;
    lesson: RealtimeLesson | undefined;
    connectedAt: Date;
  }
}
