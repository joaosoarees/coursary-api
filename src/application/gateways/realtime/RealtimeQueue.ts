import type { Lesson } from '@application/entities/outline/Lesson';
import type { Question } from '@application/entities/question/Question';

export interface RealtimeQueue {
  enqueue: (changes: RealtimeQueue.LessonChange[]) => Promise<void>;
}

export namespace RealtimeQueue {
  // One per lesson and stream batch: an answer writes the answer and its question's count together.
  export interface LessonChange {
    lessonId: Lesson.Id;
    questionIds: Question.Id[];
    listChanged: boolean;
  }
}
