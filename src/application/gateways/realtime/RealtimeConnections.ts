import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

export interface RealtimeConnections {
  // Best effort: a failure is logged, never thrown, so it cannot undo the change that ended the
  // access (signing out, disabling, cancelling, deleting the course).
  closeForAccount: (input: RealtimeConnections.CloseInput) => Promise<void>;

  closeForLesson: (lessonId: Lesson.Id) => Promise<void>;
}

export namespace RealtimeConnections {
  export interface CloseInput {
    accountId: Account.Id;
    // Only the connections to this course's lessons; every one of the account without it.
    courseId?: Course.Id;
  }
}
