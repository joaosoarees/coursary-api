import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

export class LessonContentItem {
  static readonly type = 'LessonContent';

  private readonly keys: LessonContentItem.Keys;

  constructor(private readonly attributes: LessonContentItem.Attributes) {
    this.keys = {
      PK: LessonContentItem.getPK(attributes.id),
      SK: LessonContentItem.getSK(),
    };
  }

  toItem(): LessonContentItem.ItemType {
    return { ...this.keys, ...this.attributes, type: LessonContentItem.type };
  }

  static fromEntity(lesson: Lesson): LessonContentItem {
    return new LessonContentItem({
      id: lesson.id,
      courseId: lesson.courseId,
      body: lesson.body,
    });
  }

  static getPK(id: Lesson.Id): LessonContentItem.Keys['PK'] {
    return `LESSON#${id}`;
  }

  static getSK(): LessonContentItem.Keys['SK'] {
    return 'CONTENT';
  }
}

export namespace LessonContentItem {
  export interface Keys {
    PK: `LESSON#${string}`;
    SK: 'CONTENT';
  }

  export interface Attributes {
    id: Lesson.Id;
    courseId: Course.Id;
    body: string;
  }

  export type ItemType = Keys & Attributes & { type: 'LessonContent' };
}
