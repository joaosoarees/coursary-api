import type { Account } from '@application/entities/account/Account';
import { Course, courseStatuses } from '@application/entities/course/Course';

export class CourseItem {
  static readonly type = 'Course';

  // Written only by the delete route and read only by its job; never a status of the domain (Q369).
  static readonly deletingStatus = 'DELETING';

  private readonly keys: CourseItem.Keys;

  constructor(private readonly attributes: CourseItem.Attributes) {
    const published =
      attributes.status === courseStatuses.Published && attributes.publishedAt;
    this.keys = {
      PK: CourseItem.getPK(attributes.id),
      SK: CourseItem.getSK(attributes.id),
      GSI1PK: CourseItem.getGSI1PK(attributes.instructorId),
      GSI1SK: CourseItem.getGSI1SK(attributes.id),
      // Only a published course is in the catalog (a sparse index, Q10).
      ...(published
        ? {
            GSI2PK: CourseItem.getGSI2PK(),
            GSI2SK: CourseItem.getGSI2SK(published, attributes.id),
          }
        : {}),
    };
  }

  toItem(): CourseItem.ItemType {
    return { ...this.keys, ...this.attributes, type: CourseItem.type };
  }

  static fromEntity(course: Course): CourseItem {
    return new CourseItem({
      id: course.id,
      instructorId: course.instructorId,
      instructorName: course.instructorName,
      title: course.title,
      status: course.status,
      lessonCount: course.lessonCount,
      enrollmentCount: course.enrollmentCount,
      ...(course.ratingCount > 0
        ? { ratingSum: course.ratingSum, ratingCount: course.ratingCount }
        : {}),
      ...(course.publishedAt
        ? { publishedAt: course.publishedAt.toISOString() }
        : {}),
      createdAt: course.createdAt.toISOString(),
    });
  }

  // A course being deleted reads as absent, like an expired account (Q369).
  static toLiveEntity(item: CourseItem.ItemType): Course | null {
    return (item.status as string) === CourseItem.deletingStatus
      ? null
      : CourseItem.toEntity(item);
  }

  static toEntity(item: CourseItem.ItemType): Course {
    return new Course({
      id: item.id,
      instructorId: item.instructorId,
      instructorName: item.instructorName,
      title: item.title,
      status: item.status,
      lessonCount: item.lessonCount,
      enrollmentCount: item.enrollmentCount,
      ratingSum: item.ratingSum ?? 0,
      ratingCount: item.ratingCount ?? 0,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : undefined,
      createdAt: new Date(item.createdAt),
    });
  }

  static getPK(id: Course.Id): CourseItem.Keys['PK'] {
    return `COURSE#${id}`;
  }

  static getSK(id: Course.Id): CourseItem.Keys['SK'] {
    return `COURSE#${id}`;
  }

  static getGSI1PK(instructorId: Account.Id): CourseItem.Keys['GSI1PK'] {
    return `INSTRUCTOR#${instructorId}`;
  }

  static getGSI1SK(id: Course.Id): CourseItem.Keys['GSI1SK'] {
    return `COURSE#${id}`;
  }

  static getGSI2PK(): NonNullable<CourseItem.Keys['GSI2PK']> {
    return 'CATALOG';
  }

  static getGSI2SK(
    publishedAt: string,
    id: Course.Id,
  ): NonNullable<CourseItem.Keys['GSI2SK']> {
    return `${publishedAt}#${id}`;
  }
}

export namespace CourseItem {
  export interface Keys {
    PK: `COURSE#${string}`;
    SK: `COURSE#${string}`;
    GSI1PK: `INSTRUCTOR#${string}`;
    GSI1SK: `COURSE#${string}`;
    GSI2PK?: 'CATALOG';
    GSI2SK?: `${string}#${string}`;
  }

  export interface Attributes {
    id: Course.Id;
    instructorId: Account.Id;
    instructorName: string;
    title: string;
    status: Course.Status;
    lessonCount: number;
    enrollmentCount: number;
    // Written by the first review (Q83, Q112).
    ratingSum?: number;
    ratingCount?: number;
    publishedAt?: string;
    createdAt: string;
  }

  export type ItemType = Keys & Attributes & { type: 'Course' };
}
