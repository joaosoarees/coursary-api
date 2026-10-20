import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';

export const enrollmentStatuses = {
  Active: 'ACTIVE',
  Cancelled: 'CANCELLED',
} as const;

export class Enrollment {
  readonly accountId: Account.Id;
  readonly courseId: Course.Id;
  status: Enrollment.Status;
  studentName: string;
  readonly enrolledAt: Date;
  completedLessons: number;

  constructor(attributes: Enrollment.Attributes) {
    this.accountId = attributes.accountId;
    this.courseId = attributes.courseId;
    this.status = attributes.status;
    this.studentName = attributes.studentName;
    this.enrolledAt = attributes.enrolledAt;
    this.completedLessons = attributes.completedLessons;
  }

  activate(): void {
    this.status = enrollmentStatuses.Active;
  }

  isActive(): boolean {
    return this.status === enrollmentStatuses.Active;
  }

  static create({
    student,
    course,
  }: {
    student: Account;
    course: Course;
  }): Enrollment {
    return new Enrollment({
      accountId: student.id,
      courseId: course.id,
      status: enrollmentStatuses.Active,
      studentName: student.name,
      enrolledAt: new Date(),
      completedLessons: 0,
    });
  }
}

export namespace Enrollment {
  export type Status =
    (typeof enrollmentStatuses)[keyof typeof enrollmentStatuses];

  export interface Attributes {
    accountId: Account.Id;
    courseId: Course.Id;
    status: Status;
    studentName: string;
    enrolledAt: Date;
    completedLessons: number;
  }
}
