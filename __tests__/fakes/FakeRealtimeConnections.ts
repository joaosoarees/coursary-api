import type { Lesson } from '@application/entities/outline/Lesson';
import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';

export class FakeRealtimeConnections implements RealtimeConnections {
  readonly closed: RealtimeConnections.CloseInput[] = [];

  readonly closedLessons: Lesson.Id[] = [];

  closeForAccount(input: RealtimeConnections.CloseInput): Promise<void> {
    this.closed.push(input);

    return Promise.resolve();
  }

  closeForLesson(lessonId: Lesson.Id): Promise<void> {
    this.closedLessons.push(lessonId);

    return Promise.resolve();
  }
}
