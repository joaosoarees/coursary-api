import KSUID from 'ksuid';

import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export const exportStatuses = {
  Pending: 'PENDING',
  Ready: 'READY',
  Failed: 'FAILED',
} as const;

const MINUTE = 60 * 1000;

// A CSV of a course's active students, written by a job (Q384).
export class StudentExport {
  // A job not done by then is taken as failed, and the course takes a new export (Q427, Q428).
  static readonly pendingMinutes = 15;

  readonly id: StudentExport.Id;
  readonly courseId: Course.Id;
  readonly requestedBy: Account.Id;
  status: StudentExport.Status;
  rowCount: number | undefined;
  readonly createdAt: Date;

  constructor(attributes: StudentExport.Attributes) {
    this.id = attributes.id;
    this.courseId = attributes.courseId;
    this.requestedBy = attributes.requestedBy;
    this.status = attributes.status;
    this.rowCount = attributes.rowCount;
    this.createdAt = attributes.createdAt;
  }

  // In the private bucket, where a lifecycle rule deletes it (Q384, Q429).
  get fileKey(): string {
    return `exports/${this.courseId}/${this.id}.csv`;
  }

  get fileName(): string {
    return `students-${this.courseId}-${this.createdAt.toISOString().slice(0, 10)}.csv`;
  }

  // What the caller is told: a pending export past its time has failed (Q428).
  statusAt(now: Date): StudentExport.Status {
    const late =
      now.getTime() - this.createdAt.getTime() >
      StudentExport.pendingMinutes * MINUTE;

    return this.status === exportStatuses.Pending && late
      ? exportStatuses.Failed
      : this.status;
  }

  ready(rowCount: number): void {
    this.status = exportStatuses.Ready;
    this.rowCount = rowCount;
  }

  fail(): void {
    this.status = exportStatuses.Failed;
  }

  static isId(value: unknown): value is StudentExport.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  // Before this, a pending export of the course still blocks a new one (Q427).
  static pendingSince(now: Date): Date {
    return new Date(now.getTime() - StudentExport.pendingMinutes * MINUTE);
  }

  static create({
    courseId,
    requestedBy,
  }: {
    courseId: Course.Id;
    requestedBy: Account.Id;
  }): StudentExport {
    return new StudentExport({
      id: KSUID.randomSync().string as StudentExport.Id,
      courseId,
      requestedBy,
      status: exportStatuses.Pending,
      rowCount: undefined,
      createdAt: new Date(),
    });
  }
}

export namespace StudentExport {
  export type Id = string & { readonly __brand: 'StudentExport.Id' };

  export type Status = (typeof exportStatuses)[keyof typeof exportStatuses];

  export interface Attributes {
    id: Id;
    courseId: Course.Id;
    requestedBy: Account.Id;
    status: Status;
    rowCount: number | undefined;
    createdAt: Date;
  }
}
