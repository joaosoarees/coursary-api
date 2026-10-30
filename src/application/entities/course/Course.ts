import KSUID from 'ksuid';

import type { Account } from '@application/entities/account/Account';
import type { Enrollment } from '@application/entities/enrollment/Enrollment';
import type { File } from '@application/entities/file/File';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';
import { Forbidden } from '@application/errors/common';
import {
  CourseArchived,
  CourseNotFound,
  CoursePublished,
} from '@application/errors/course';
import { Permissions, permissions } from '@application/security/permissions';

export const courseStatuses = {
  Draft: 'DRAFT',
  Published: 'PUBLISHED',
  Archived: 'ARCHIVED',
} as const;

export class Course {
  readonly id: Course.Id;
  readonly instructorId: Account.Id;
  instructorName: string;
  title: string;
  status: Course.Status;
  lessonCount: number;
  enrollmentCount: number;
  ratingSum: number;
  ratingCount: number;
  publishedAt: Date | undefined;
  readonly createdAt: Date;
  // The processed cover, copied here so every list shows it.
  cover: File.Copy | undefined;

  constructor(attributes: Course.Attributes) {
    this.id = attributes.id;
    this.instructorId = attributes.instructorId;
    this.instructorName = attributes.instructorName;
    this.title = attributes.title;
    this.status = attributes.status;
    this.lessonCount = attributes.lessonCount;
    this.enrollmentCount = attributes.enrollmentCount;
    this.ratingSum = attributes.ratingSum;
    this.ratingCount = attributes.ratingCount;
    this.publishedAt = attributes.publishedAt;
    this.createdAt = attributes.createdAt;
    this.cover = attributes.cover;
  }

  isOwnedBy(accountId: Account.Id): boolean {
    return this.instructorId === accountId;
  }

  ratingAverage(): number | null {
    return this.ratingCount > 0 ? this.ratingSum / this.ratingCount : null;
  }

  isVisibleToEveryone(): boolean {
    return this.status !== courseStatuses.Draft;
  }

  isManagedBy(callerId: Account.Id, callerRole: Account.Role): boolean {
    return (
      this.isOwnedBy(callerId) ||
      Permissions.allows(callerRole, permissions.CoursesUpdateAny)
    );
  }

  requireManagedBy(callerId: Account.Id, callerRole: Account.Role): void {
    if (!this.isManagedBy(callerId, callerRole)) {
      throw this.isVisibleToEveryone() ? new Forbidden() : new CourseNotFound();
    }
  }

  requireEditableBy(callerId: Account.Id, callerRole: Account.Role): void {
    this.requireManagedBy(callerId, callerRole);

    if (this.status === courseStatuses.Archived) {
      throw new CourseArchived();
    }
  }

  requireReadableBy(
    callerId: Account.Id,
    callerRole: Account.Role,
    enrollment: Enrollment | null,
  ): void {
    const enrolled = enrollment?.isActive() && this.isVisibleToEveryone();

    if (!enrolled) {
      this.requireManagedBy(callerId, callerRole);
    }
  }

  // Only an active enrollment records progress; the owner and admins, who
  // cannot have one, are refused like anyone who knows the course.
  requireEnrolledIn(
    callerId: Account.Id,
    callerRole: Account.Role,
    enrollment: Enrollment | null,
  ): Enrollment {
    if (enrollment?.isActive() && this.isVisibleToEveryone()) {
      return enrollment;
    }

    const known =
      this.isVisibleToEveryone() ||
      this.isOwnedBy(callerId) ||
      Permissions.allows(callerRole, permissions.CoursesUpdateAny);

    throw known ? new Forbidden() : new CourseNotFound();
  }

  requireDraft(): void {
    if (this.status !== courseStatuses.Draft) {
      throw new CoursePublished();
    }
  }

  static requireFound(course: Course | null): Course {
    if (!course) {
      throw new CourseNotFound();
    }

    return course;
  }

  static isId(value: unknown): value is Course.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): Course.Id {
    if (!Course.isId(value)) {
      throw new TypeError(`Not a course id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  static create({
    instructor,
    title,
  }: {
    instructor: Account;
    title: string;
  }): Course {
    return new Course({
      id: Course.toId(KSUID.randomSync().string),
      instructorId: instructor.id,
      instructorName: instructor.name,
      title: title.trim(),
      status: courseStatuses.Draft,
      lessonCount: 0,
      enrollmentCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      publishedAt: undefined,
      createdAt: new Date(),
    });
  }
}

export namespace Course {
  export type Id = string & { readonly __brand: 'Course.Id' };

  export type Status = (typeof courseStatuses)[keyof typeof courseStatuses];

  export interface Attributes {
    id: Id;
    instructorId: Account.Id;
    instructorName: string;
    title: string;
    status: Status;
    lessonCount: number;
    enrollmentCount: number;
    ratingSum: number;
    ratingCount: number;
    publishedAt: Date | undefined;
    createdAt: Date;
    cover?: File.Copy;
  }

  export interface Changes {
    title?: string;
    description?: string;
  }
}
