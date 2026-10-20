import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

// Where the student stopped in a course: one item, overwritten (Q55, Q280).
export class CoursePosition {
  readonly accountId: Account.Id;
  readonly courseId: Course.Id;
  readonly lessonId: Lesson.Id;
  readonly positionSeconds: number;
  readonly savedAt: Date;

  constructor(attributes: CoursePosition.Attributes) {
    this.accountId = attributes.accountId;
    this.courseId = attributes.courseId;
    this.lessonId = attributes.lessonId;
    this.positionSeconds = attributes.positionSeconds;
    this.savedAt = attributes.savedAt;
  }

  static create({
    accountId,
    courseId,
    lessonId,
    positionSeconds,
  }: {
    accountId: Account.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    positionSeconds: number;
  }): CoursePosition {
    return new CoursePosition({
      accountId,
      courseId,
      lessonId,
      positionSeconds,
      savedAt: new Date(),
    });
  }
}

export namespace CoursePosition {
  export interface Attributes {
    accountId: Account.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    positionSeconds: number;
    savedAt: Date;
  }
}
