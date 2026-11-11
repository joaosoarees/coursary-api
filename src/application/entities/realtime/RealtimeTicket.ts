import { createHash, randomBytes } from 'node:crypto';

import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';

export class RealtimeTicket {
  static readonly lifetimeSeconds = 30;

  readonly hash: string;
  readonly accountId: Account.Id;
  readonly courseId: Course.Id;
  readonly lessonId: Lesson.Id;
  readonly expiresAt: Date;

  constructor(attributes: RealtimeTicket.Attributes) {
    this.hash = attributes.hash;
    this.accountId = attributes.accountId;
    this.courseId = attributes.courseId;
    this.lessonId = attributes.lessonId;
    this.expiresAt = attributes.expiresAt;
  }

  // TTL removes an expired ticket days later: until then it is still in the table.
  isExpiredAt(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  // Only the hash is stored, so a ticket read from the table cannot be used.
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static issue({
    accountId,
    courseId,
    lessonId,
    now = new Date(),
  }: {
    accountId: Account.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    now?: Date;
  }): RealtimeTicket.Issued {
    const token = randomBytes(32).toString('base64url');
    const ticket = new RealtimeTicket({
      hash: RealtimeTicket.hashToken(token),
      accountId,
      courseId,
      lessonId,
      // Whole seconds, as the table keeps it for the TTL.
      expiresAt: new Date(
        (Math.floor(now.getTime() / 1000) + RealtimeTicket.lifetimeSeconds) *
          1000,
      ),
    });

    return { ticket, token };
  }
}

export namespace RealtimeTicket {
  export interface Attributes {
    hash: string;
    accountId: Account.Id;
    courseId: Course.Id;
    lessonId: Lesson.Id;
    expiresAt: Date;
  }

  export interface Issued {
    ticket: RealtimeTicket;
    token: string;
  }
}
