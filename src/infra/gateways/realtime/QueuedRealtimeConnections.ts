import type { Lesson } from '@application/entities/outline/Lesson';
import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';
import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';

const errorName = (error: unknown) =>
  error instanceof Error ? error.name : String(error);

// The socket API lives in another stack: its consumer closes the connections a few seconds later.
export class QueuedRealtimeConnections implements RealtimeConnections {
  constructor(private readonly queue: RealtimeQueue) {}

  async closeForAccount(input: RealtimeConnections.CloseInput): Promise<void> {
    try {
      await this.queue.enqueue([{ closeAccount: input }]);
    } catch (error) {
      console.error({
        event: 'RealtimeConnectionsNotClosed',
        accountId: input.accountId,
        error: errorName(error),
      });
    }
  }

  async closeForLesson(lessonId: Lesson.Id): Promise<void> {
    try {
      await this.queue.enqueue([{ closeLesson: lessonId }]);
    } catch (error) {
      console.error({
        event: 'RealtimeConnectionsNotClosed',
        lessonId,
        error: errorName(error),
      });
    }
  }
}
