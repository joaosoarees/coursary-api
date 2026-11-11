import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeConnectionRepository } from '@application/repositories/realtime/RealtimeConnectionRepository';

export class OpenRealtimeConnectionUseCase {
  constructor(
    private readonly connectionsRepository: RealtimeConnectionRepository,
  ) {}

  // The account, the course and the lesson come from the consumed ticket, never from the client.
  async execute(input: OpenRealtimeConnectionUseCase.Input): Promise<void> {
    await this.connectionsRepository.save(RealtimeConnection.open(input));
  }
}

export namespace OpenRealtimeConnectionUseCase {
  export interface Input {
    id: RealtimeConnection.Id;
    apiId: string;
    accountId: Account.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    connectedAt: Date;
  }
}
