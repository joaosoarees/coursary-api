import type { Lesson } from '@application/entities/outline/Lesson';
import type { Question } from '@application/entities/question/Question';
import type { RealtimeConnection } from '@application/entities/realtime/RealtimeConnection';

export interface RealtimeChannel {
  // Only connections opened on this API can be reached through it.
  readonly apiId: string;

  // 'gone': the client left, or never finished connecting.
  post: (
    connectionId: RealtimeConnection.Id,
    message: RealtimeChannel.Message,
  ) => Promise<'sent' | 'gone'>;
}

export namespace RealtimeChannel {
  // Only what changed: each reader reloads it over HTTP, where canDelete is worked out for them.
  export type Message =
    | { type: 'questions'; lessonId: Lesson.Id }
    | { type: 'answers'; lessonId: Lesson.Id; questionId: Question.Id };
}
