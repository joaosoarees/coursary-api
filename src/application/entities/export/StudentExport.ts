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

export class StudentExport {
  // A job not done by then is taken as failed, and the course takes a new export.
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

  get fileKey(): string {
    return `exports/${this.courseId}/${this.id}.csv`;
  }

  get fileName(): string {
    return `students-${this.courseId}-${this.createdAt.toISOString().slice(0, 10)}.csv`;
  }

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

  static toId(value: string): StudentExport.Id {
    if (!StudentExport.isId(value)) {
      throw new TypeError(`Not an export id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  // Before this, a pending export of the course still blocks a new one.
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
      id: StudentExport.toId(KSUID.randomSync().string),
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
