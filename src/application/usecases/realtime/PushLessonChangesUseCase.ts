import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';
import type { RealtimeChannel } from '@application/gateways/realtime/RealtimeChannel';
import type { RealtimeQueue } from '@application/gateways/realtime/RealtimeQueue';
import type { RealtimeConnectionRepository } from '@application/repositories/realtime/RealtimeConnectionRepository';

// API Gateway's request quota is shared by every API of the account and region.
const IN_FLIGHT = 10;

export class PushLessonChangesUseCase {
  constructor(
    private readonly connectionsRepository: RealtimeConnectionRepository,
    private readonly channel: RealtimeChannel,
  ) {}

  // A message that fails comes back from the queue and is pushed again: the client only reloads.
  async execute(
    { lessonId, questionIds, listChanged }: RealtimeQueue.LessonChange,
    now = new Date(),
  ): Promise<void> {
    const messages = PushLessonChangesUseCase.messagesOf({
      lessonId,
      questionIds,
      listChanged,
    });

    if (messages.length === 0) {
      return;
    }

    const connections = await this.connectionsRepository.findByLesson(
      lessonId,
      now,
    );
    const pending = connections.filter(
      (connection) => connection.apiId === this.channel.apiId,
    );
    let failures = 0;

    const push = async (connection: RealtimeConnection) => {
      for (const message of messages) {
        const result = await this.channel.post(connection.id, message);

        if (result === 'gone') {
          await this.connectionsRepository.remove(connection.id);

          return;
        }
      }
    };

    const worker = async () => {
      for (
        let connection = pending.shift();
        connection;
        connection = pending.shift()
      ) {
        try {
          await push(connection);
        } catch (error) {
          failures += 1;
          console.error({
            connectionId: connection.id,
            error: error instanceof Error ? error.name : String(error),
          });
        }
      }
    };

    await Promise.all(Array.from({ length: IN_FLIGHT }, worker));

    if (failures > 0) {
      throw new Error(
        `${String(failures)} connections of lesson ${lessonId} were not reached.`,
      );
    }
  }

  // The answers message also reloads the list, for the count: a list message beside it adds nothing.
  static messagesOf({
    lessonId,
    questionIds,
    listChanged,
  }: RealtimeQueue.LessonChange): RealtimeChannel.Message[] {
    if (questionIds.length > 0) {
      return questionIds.map((questionId) => ({
        type: 'answers',
        lessonId,
        questionId,
      }));
    }

    return listChanged ? [{ type: 'questions', lessonId }] : [];
  }
}
