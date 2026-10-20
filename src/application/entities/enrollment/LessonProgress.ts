import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { Lesson } from '@application/entities/outline/Lesson';

// A lesson the student completed; written once (Q9, Q278).
export class LessonProgress {
  readonly accountId: Account.Id;
  readonly courseId: Course.Id;
  readonly lessonId: Lesson.Id;
  readonly completedAt: Date;

  constructor(attributes: LessonProgress.Attributes) {
    this.accountId = attributes.accountId;
    this.courseId = attributes.courseId;
    this.lessonId = attributes.lessonId;
    this.completedAt = attributes.completedAt;
  }

  static create({
    enrollment,
    lessonId,
  }: {
    enrollment: Enrollment;
    lessonId: Lesson.Id;
  }): LessonProgress {
    return new LessonProgress({
      accountId: enrollment.accountId,
      courseId: enrollment.courseId,
      lessonId,
      completedAt: new Date(),
    });
  }
}

export namespace LessonProgress {
  export interface Attributes {
    accountId: Account.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    completedAt: Date;
  }
}
