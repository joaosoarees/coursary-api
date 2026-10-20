import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import { LessonProgress } from '@application/entities/enrollment/LessonProgress';
import type { Lesson } from '@application/entities/outline/Lesson';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';

export class LessonProgressItem {
  static readonly type = 'LessonProgress';

  private readonly keys: LessonProgressItem.Keys;

  constructor(private readonly attributes: LessonProgressItem.Attributes) {
    this.keys = {
      PK: LessonProgressItem.getPK(attributes.accountId),
      SK: LessonProgressItem.getSK(attributes.courseId, attributes.lessonId),
    };
  }

  toItem(): LessonProgressItem.ItemType {
    return { ...this.keys, ...this.attributes, type: LessonProgressItem.type };
  }

  static fromEntity(progress: LessonProgress): LessonProgressItem {
    return new LessonProgressItem({
      accountId: progress.accountId,
      courseId: progress.courseId,
      lessonId: progress.lessonId,
      completedAt: progress.completedAt.toISOString(),
    });
  }

  static toEntity(item: LessonProgressItem.ItemType): LessonProgress {
    return new LessonProgress({
      accountId: item.accountId,
      courseId: item.courseId,
      lessonId: item.lessonId,
      completedAt: new Date(item.completedAt),
    });
  }

  static getPK(accountId: Account.Id): LessonProgressItem.Keys['PK'] {
    return AccountItem.getPK(accountId);
  }

  static getSK(
    courseId: Course.Id,
    lessonId: Lesson.Id,
  ): LessonProgressItem.Keys['SK'] {
    return `PROGRESS#${courseId}#LESSON#${lessonId}`;
  }
}

export namespace LessonProgressItem {
  export interface Keys {
    PK: `ACCOUNT#${string}`;
    SK: `PROGRESS#${string}#LESSON#${string}`;
  }

  export interface Attributes {
    accountId: Account.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    completedAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'LessonProgress' };
}
