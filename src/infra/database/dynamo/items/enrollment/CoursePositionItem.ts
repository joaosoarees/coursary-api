import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import { CoursePosition } from '@application/entities/enrollment/CoursePosition';
import type { Lesson } from '@application/entities/outline/Lesson';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';

export class CoursePositionItem {
  static readonly type = 'CoursePosition';

  private readonly keys: CoursePositionItem.Keys;

  constructor(private readonly attributes: CoursePositionItem.Attributes) {
    this.keys = {
      PK: CoursePositionItem.getPK(attributes.accountId),
      SK: CoursePositionItem.getSK(attributes.courseId),
    };
  }

  toItem(): CoursePositionItem.ItemType {
    return { ...this.keys, ...this.attributes, type: CoursePositionItem.type };
  }

  static fromEntity(position: CoursePosition): CoursePositionItem {
    return new CoursePositionItem({
      accountId: position.accountId,
      courseId: position.courseId,
      lessonId: position.lessonId,
      positionSeconds: position.positionSeconds,
      savedAt: position.savedAt.toISOString(),
    });
  }

  static toEntity(item: CoursePositionItem.ItemType): CoursePosition {
    return new CoursePosition({
      accountId: item.accountId,
      courseId: item.courseId,
      lessonId: item.lessonId,
      positionSeconds: item.positionSeconds,
      savedAt: new Date(item.savedAt),
    });
  }

  static getPK(accountId: Account.Id): CoursePositionItem.Keys['PK'] {
    return AccountItem.getPK(accountId);
  }

  static getSK(courseId: Course.Id): CoursePositionItem.Keys['SK'] {
    return `PROGRESS#${courseId}`;
  }
}

export namespace CoursePositionItem {
  export interface Keys {
    PK: `ACCOUNT#${string}`;
    SK: `PROGRESS#${string}`;
  }

  export interface Attributes {
    accountId: Account.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    positionSeconds: number;
    savedAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'CoursePosition' };
}
