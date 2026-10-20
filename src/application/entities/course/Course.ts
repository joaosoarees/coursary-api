import KSUID from 'ksuid';

import type { Account } from '@application/entities/account/Account';
import type { Enrollment } from '@application/entities/enrollment/Enrollment';
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
  }

  isOwnedBy(accountId: Account.Id): boolean {
    return this.instructorId === accountId;
  }

  // Computed on read, never stored (Q83).
  ratingAverage(): number | null {
    return this.ratingCount > 0 ? this.ratingSum / this.ratingCount : null;
  }

  isVisibleToEveryone(): boolean {
    return this.status !== courseStatuses.Draft;
  }

  // The owner or an admin manages a course; anyone else learns only what they
  // could see (Q95, Q270).
  requireManagedBy(callerId: Account.Id, callerRole: Account.Role): void {
    const manages =
      this.isOwnedBy(callerId) ||
      Permissions.allows(callerRole, permissions.CoursesUpdateAny);

    if (!manages) {
      throw this.isVisibleToEveryone() ? new Forbidden() : new CourseNotFound();
    }
  }

  // Managing is not enough to change it: an archived course takes no change (Q206).
  requireEditableBy(callerId: Account.Id, callerRole: Account.Role): void {
    this.requireManagedBy(callerId, callerRole);

    if (this.status === courseStatuses.Archived) {
      throw new CourseArchived();
    }
  }

  // Who studies a course: the owner or an admin in any status, or an active
  // enrollment once it is visible; anyone else as in Q95 (Q240, Q275).
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
  // cannot have one, are refused like anyone who knows the course (Q278).
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

  // Only a draft loses modules and lessons (Q24, Q223).
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
  }

  export interface Changes {
    title?: string;
    description?: string;
  }
}
