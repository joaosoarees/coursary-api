import type { Course } from '@application/entities/course/Course';
import { Module } from '@application/entities/outline/Module';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';

export class ModuleItem {
  static readonly type = 'Module';

  private readonly keys: ModuleItem.Keys;

  constructor(private readonly attributes: ModuleItem.Attributes) {
    this.keys = {
      PK: ModuleItem.getPK(attributes.courseId),
      SK: ModuleItem.getSK(attributes.id),
    };
  }

  toItem(): ModuleItem.ItemType {
    return { ...this.keys, ...this.attributes, type: ModuleItem.type };
  }

  static fromEntity(module: Module): ModuleItem {
    return new ModuleItem({
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      position: module.position,
      lessonCount: module.lessonCount,
    });
  }

  static toEntity(item: ModuleItem.ItemType): Module {
    return new Module({
      id: item.id,
      courseId: item.courseId,
      title: item.title,
      position: item.position,
      lessonCount: item.lessonCount ?? 0,
    });
  }

  static getPK(courseId: Course.Id): ModuleItem.Keys['PK'] {
    return CourseItem.getPK(courseId);
  }

  static getSK(id: Module.Id): ModuleItem.Keys['SK'] {
    return `MODULE#${id}`;
  }
}

export namespace ModuleItem {
  export interface Keys {
    PK: `COURSE#${string}`;
    SK: `MODULE#${string}`;
  }

  export interface Attributes {
    id: Module.Id;
    courseId: Course.Id;
    title: string;
    position: number;
    // Absent on modules written before Q288 until the backfill.
    lessonCount?: number;
  }

  export type ItemType = Keys & Attributes & { type: 'Module' };
}
