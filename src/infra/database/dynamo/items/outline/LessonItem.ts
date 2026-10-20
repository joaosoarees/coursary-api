import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Module } from '@application/entities/outline/Module';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';

// The lesson as the outline shows it; the body lives in LessonContentItem (Q72).
export class LessonItem {
  static readonly type = 'Lesson';

  private readonly keys: LessonItem.Keys;

  constructor(private readonly attributes: LessonItem.Attributes) {
    this.keys = {
      PK: LessonItem.getPK(attributes.courseId),
      SK: LessonItem.getSK(attributes.moduleId, attributes.id),
    };
  }

  toItem(): LessonItem.ItemType {
    return { ...this.keys, ...this.attributes, type: LessonItem.type };
  }

  static fromEntity(lesson: Lesson): LessonItem {
    return new LessonItem({
      id: lesson.id,
      courseId: lesson.courseId,
      moduleId: lesson.moduleId,
      title: lesson.title,
      durationMinutes: lesson.durationMinutes,
      position: lesson.position,
    });
  }

  // The item has no body, so it reads back as a summary, not a Lesson (Q337).
  static toSummary(item: LessonItem.ItemType): Lesson.Summary {
    return {
      id: item.id,
      moduleId: item.moduleId,
      title: item.title,
      durationMinutes: item.durationMinutes,
      position: item.position,
    };
  }

  static getPK(courseId: Course.Id): LessonItem.Keys['PK'] {
    return CourseItem.getPK(courseId);
  }

  static getSK(moduleId: Module.Id, id: Lesson.Id): LessonItem.Keys['SK'] {
    return `MODULE#${moduleId}#LESSON#${id}`;
  }
}

export namespace LessonItem {
  export interface Keys {
    PK: `COURSE#${string}`;
    SK: `MODULE#${string}#LESSON#${string}`;
  }

  export interface Attributes {
    id: Lesson.Id;
    courseId: Course.Id;
    moduleId: Module.Id;
    title: string;
    durationMinutes: number;
    position: number;
  }

  export type ItemType = Keys & Attributes & { type: 'Lesson' };
}
