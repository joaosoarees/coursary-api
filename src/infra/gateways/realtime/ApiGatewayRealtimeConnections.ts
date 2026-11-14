import type { Lesson } from '@application/entities/outline/Lesson';
import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeChannel } from '@application/gateways/realtime/RealtimeChannel';
import type { RealtimeConnections } from '@application/gateways/realtime/RealtimeConnections';
import type { RealtimeConnectionRepository } from '@application/repositories/realtime/RealtimeConnectionRepository';

const errorName = (error: unknown) =>
  error instanceof Error ? error.name : String(error);

export class ApiGatewayRealtimeConnections implements RealtimeConnections {
  constructor(
    private readonly connectionsRepository: RealtimeConnectionRepository,
    private readonly channel: RealtimeChannel,
  ) {}

  async closeForAccount(
    { accountId, courseId }: RealtimeConnections.CloseInput,
    now = new Date(),
  ): Promise<void> {
    try {
      const connections = await this.connectionsRepository.findByAccount(
        accountId,
        now,
      );
      const closing = connections.filter(
        (connection) => !courseId || connection.lesson?.courseId === courseId,
      );

      await Promise.all(closing.map((connection) => this.close(connection)));
    } catch (error) {
      console.error({
        event: 'RealtimeConnectionsNotClosed',
        accountId,
        error: errorName(error),
      });
    }
  }

  async closeForLesson(lessonId: Lesson.Id, now = new Date()): Promise<void> {
    try {
      const connections = await this.connectionsRepository.findByLesson(
        lessonId,
        now,
      );

      await Promise.all(
        connections.map((connection) => this.close(connection)),
      );
    } catch (error) {
      console.error({
        event: 'RealtimeConnectionsNotClosed',
        lessonId,
        error: errorName(error),
      });
    }
  }

  // The item goes first: from then on nothing is pushed to it, even if the close below fails.
  private async close(connection: RealtimeConnection): Promise<void> {
    try {
      await this.connectionsRepository.remove(connection.id);

      if (connection.apiId === this.channel.apiId) {
        await this.channel.close(connection.id);
      }
    } catch (error) {
      console.error({
        event: 'RealtimeConnectionNotClosed',
        connectionId: connection.id,
        error: errorName(error),
      });
    }
  }
}
