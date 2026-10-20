import type { Course } from '@application/entities/course/Course';

// Kept apart so the course item stays small for its counters (Q298, Q307).
export class CourseDescriptionItem {
  static readonly type = 'CourseDescription';

  private readonly keys: CourseDescriptionItem.Keys;

  constructor(private readonly attributes: CourseDescriptionItem.Attributes) {
    this.keys = {
      PK: CourseDescriptionItem.getPK(attributes.courseId),
      SK: CourseDescriptionItem.getSK(),
    };
  }

  toItem(): CourseDescriptionItem.ItemType {
    return {
      ...this.keys,
      ...this.attributes,
      type: CourseDescriptionItem.type,
    };
  }

  // A course without a description has no item.
  static toDescription(
    item: CourseDescriptionItem.ItemType | undefined,
  ): string {
    return item?.description ?? '';
  }

  static getPK(courseId: Course.Id): CourseDescriptionItem.Keys['PK'] {
    return `COURSE#${courseId}`;
  }

  static getSK(): CourseDescriptionItem.Keys['SK'] {
    return 'DESCRIPTION';
  }
}

export namespace CourseDescriptionItem {
  export interface Keys {
    PK: `COURSE#${string}`;
    SK: 'DESCRIPTION';
  }

  export interface Attributes {
    courseId: Course.Id;
    description: string;
  }

  export type ItemType = Keys & Attributes & { type: 'CourseDescription' };
}
