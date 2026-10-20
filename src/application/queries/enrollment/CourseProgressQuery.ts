import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

export interface CourseProgressQuery {
  execute: (
    input: CourseProgressQuery.Input,
  ) => Promise<CourseProgressQuery.Result>;
}

export namespace CourseProgressQuery {
  export interface Input {
    accountId: Account.Id;
    courseId: Course.Id;
  }

  export interface Result {
    completedLessonIds: Lesson.Id[];
    lastLessonId: Lesson.Id | null;
    positionSeconds: number | null;
  }
}
