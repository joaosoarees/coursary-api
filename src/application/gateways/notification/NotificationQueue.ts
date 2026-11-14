import type { Course } from '@application/entities/course/Course';
import type { StudentExport } from '@application/entities/export/StudentExport';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Answer } from '@application/entities/question/Answer';
import type { Question } from '@application/entities/question/Question';

export interface NotificationQueue {
  enqueue: (requests: NotificationQueue.Request[]) => Promise<void>;
}

export namespace NotificationQueue {
  export type Request =
    | {
        kind: 'answer';
        lessonId: Lesson.Id;
        questionId: Question.Id;
        answerId: Answer.Id;
      }
    | { kind: 'question'; lessonId: Lesson.Id; questionId: Question.Id }
    // One page of the course's active students; the next page comes as another message.
    // occurredAt is the stream record's time, the same on every page and every redelivery.
    | {
        kind: 'lesson';
        courseId: Course.Id;
        lessonId: Lesson.Id;
        occurredAt: string;
        cursor?: string;
      }
    | {
        kind: 'archived';
        courseId: Course.Id;
        occurredAt: string;
        cursor?: string;
      }
    | { kind: 'export-ready'; exportId: StudentExport.Id; occurredAt: string };
}
