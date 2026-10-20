import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import {
  Enrollment,
  enrollmentStatuses,
} from '@application/entities/enrollment/Enrollment';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';

// Kept in the student's partition; only an active one is in the course's
// list of students and in the student's list of courses (sparse indexes, Q49,
// Q73, Q268).
export class EnrollmentItem {
  static readonly type = 'Enrollment';

  private readonly keys: EnrollmentItem.Keys;

  constructor(private readonly attributes: EnrollmentItem.Attributes) {
    const active = attributes.status === enrollmentStatuses.Active;
    this.keys = {
      PK: EnrollmentItem.getPK(attributes.accountId),
      SK: EnrollmentItem.getSK(attributes.courseId),
      ...(active
        ? {
            GSI1PK: EnrollmentItem.getGSI1PK(attributes.courseId),
            GSI1SK: EnrollmentItem.getGSI1SK(
              attributes.enrolledAt,
              attributes.accountId,
            ),
            GSI2PK: EnrollmentItem.getGSI2PK(attributes.accountId),
            GSI2SK: EnrollmentItem.getGSI2SK(
              attributes.enrolledAt,
              attributes.courseId,
            ),
          }
        : {}),
    };
  }

  toItem(): EnrollmentItem.ItemType {
    return { ...this.keys, ...this.attributes, type: EnrollmentItem.type };
  }

  static fromEntity(enrollment: Enrollment): EnrollmentItem {
    return new EnrollmentItem({
      accountId: enrollment.accountId,
      courseId: enrollment.courseId,
      status: enrollment.status,
      studentName: enrollment.studentName,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      completedLessons: enrollment.completedLessons,
    });
  }

  static toEntity(item: EnrollmentItem.ItemType): Enrollment {
    return new Enrollment({
      accountId: item.accountId,
      courseId: item.courseId,
      status: item.status,
      studentName: item.studentName,
      enrolledAt: new Date(item.enrolledAt),
      completedLessons: item.completedLessons,
    });
  }

  static getPK(accountId: Account.Id): EnrollmentItem.Keys['PK'] {
    return AccountItem.getPK(accountId);
  }

  static getSK(courseId: Course.Id): EnrollmentItem.Keys['SK'] {
    return `ENROLLMENT#${courseId}`;
  }

  static getGSI1PK(
    courseId: Course.Id,
  ): NonNullable<EnrollmentItem.Keys['GSI1PK']> {
    return CourseItem.getPK(courseId);
  }

  static getGSI1SK(
    enrolledAt: string,
    accountId: Account.Id,
  ): NonNullable<EnrollmentItem.Keys['GSI1SK']> {
    return `ENROLLMENT#${enrolledAt}#${accountId}`;
  }

  static getGSI2PK(
    accountId: Account.Id,
  ): NonNullable<EnrollmentItem.Keys['GSI2PK']> {
    return `ENROLLMENTS#${accountId}`;
  }

  static getGSI2SK(
    enrolledAt: string,
    courseId: Course.Id,
  ): NonNullable<EnrollmentItem.Keys['GSI2SK']> {
    return `${enrolledAt}#${courseId}`;
  }
}

export namespace EnrollmentItem {
  export interface Keys {
    PK: `ACCOUNT#${string}`;
    SK: `ENROLLMENT#${string}`;
    GSI1PK?: `COURSE#${string}`;
    GSI1SK?: `ENROLLMENT#${string}#${string}`;
    GSI2PK?: `ENROLLMENTS#${string}`;
    GSI2SK?: `${string}#${string}`;
  }

  export interface Attributes {
    accountId: Account.Id;
    courseId: Course.Id;
    status: Enrollment.Status;
    studentName: string;
    enrolledAt: string;
    completedLessons: number;
  }

  export type ItemType = Keys & Attributes & { type: 'Enrollment' };
}
