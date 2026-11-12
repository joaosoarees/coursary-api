import { createHash } from 'node:crypto';

import KSUID from 'ksuid';

import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Question } from '@application/entities/question/Question';
import { KSUID_PATTERN } from '@application/entities/shared/ksuid';

export const notificationKinds = {
  Answer: 'answer',
  Question: 'question',
  Lesson: 'lesson',
  Archived: 'archived',
} as const;

const DAY = 24 * 60 * 60 * 1000;

export class Notification {
  static readonly lifetimeDays = 90;

  readonly id: Notification.Id;
  readonly accountId: Account.Id;
  readonly kind: Notification.Kind;
  readonly courseId: Course.Id;
  readonly courseTitle: string;
  readonly lessonId: Lesson.Id | undefined;
  readonly lessonTitle: string | undefined;
  readonly questionId: Question.Id | undefined;
  readonly actorName: string | undefined;
  readonly byInstructor: boolean;
  readAt: Date | undefined;
  readonly createdAt: Date;

  constructor(attributes: Notification.Attributes) {
    this.id = attributes.id;
    this.accountId = attributes.accountId;
    this.kind = attributes.kind;
    this.courseId = attributes.courseId;
    this.courseTitle = attributes.courseTitle;
    this.lessonId = attributes.lessonId;
    this.lessonTitle = attributes.lessonTitle;
    this.questionId = attributes.questionId;
    this.actorName = attributes.actorName;
    this.byInstructor = attributes.byInstructor;
    this.readAt = attributes.readAt;
    this.createdAt = attributes.createdAt;
  }

  get expiresAt(): Date {
    return new Date(this.createdAt.getTime() + Notification.lifetimeDays * DAY);
  }

  isRead(): boolean {
    return this.readAt !== undefined;
  }

  static isId(value: unknown): value is Notification.Id {
    return typeof value === 'string' && KSUID_PATTERN.test(value);
  }

  static toId(value: string): Notification.Id {
    if (!Notification.isId(value)) {
      throw new TypeError(`Not a notification id: ${JSON.stringify(value)}`);
    }

    return value;
  }

  // The same event for the same person always gives the same id: a message delivered twice, or
  // redriven with a new message id, writes nothing new. Ordered by when the event happened.
  static create({
    sourceId,
    occurredAt,
    ...content
  }: Notification.Content & {
    sourceId: string;
    occurredAt: Date;
  }): Notification {
    const payload = createHash('sha256')
      .update(`${content.kind}|${sourceId}|${content.accountId}`)
      .digest()
      .subarray(0, 16);

    return new Notification({
      ...content,
      id: Notification.toId(
        KSUID.fromParts(occurredAt.getTime(), payload).string,
      ),
      readAt: undefined,
      createdAt: occurredAt,
    });
  }
}

export namespace Notification {
  export type Id = string & { readonly __brand: 'Notification.Id' };

  export type Kind = (typeof notificationKinds)[keyof typeof notificationKinds];

  export interface Content {
    accountId: Account.Id;
    kind: Kind;
    courseId: Course.Id;
    courseTitle: string;
    lessonId: Lesson.Id | undefined;
    lessonTitle: string | undefined;
    questionId: Question.Id | undefined;
    actorName: string | undefined;
    byInstructor: boolean;
  }

  export interface Attributes extends Content {
    id: Id;
    readAt: Date | undefined;
    createdAt: Date;
  }
}
