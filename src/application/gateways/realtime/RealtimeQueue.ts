import type { Account } from '@application/entities/account/Account';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Question } from '@application/entities/question/Question';

export interface RealtimeQueue {
  enqueue: (changes: RealtimeQueue.Change[]) => Promise<void>;
}

export namespace RealtimeQueue {
  // One per lesson and stream batch: an answer writes the answer and its question's count together.
  export interface LessonChange {
    lessonId: Lesson.Id;
    questionIds: Question.Id[];
    listChanged: boolean;
  }

  // Accounts with new notifications, from one run of the notification consumer.
  export interface AccountChange {
    accountIds: Account.Id[];
  }

  export type Change = LessonChange | AccountChange;
}
