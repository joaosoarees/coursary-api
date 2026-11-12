import type { Account } from '@application/entities/account/Account';
import type { Course } from '@application/entities/course/Course';
import { Notification } from '@application/entities/notification/Notification';
import type { Lesson } from '@application/entities/outline/Lesson';
import type { Question } from '@application/entities/question/Question';
import { nowInSeconds } from '@infra/database/dynamo/ttl';

// Its own partition, so reading an account's partition never brings the inbox along. Only an
// unread notification has the GSI1 keys: the index holds the unread ones and nothing else.
export class NotificationItem {
  static readonly type = 'Notification';

  private readonly keys: NotificationItem.Keys;

  constructor(private readonly attributes: NotificationItem.Attributes) {
    this.keys = {
      PK: NotificationItem.getPK(attributes.accountId),
      SK: NotificationItem.getSK(attributes.id),
      ...(attributes.readAt === undefined
        ? {
            GSI1PK: NotificationItem.getGSI1PK(attributes.accountId),
            GSI1SK: NotificationItem.getSK(attributes.id),
          }
        : {}),
    };
  }

  toItem(): NotificationItem.ItemType {
    return { ...this.keys, ...this.attributes, type: NotificationItem.type };
  }

  static fromEntity(notification: Notification): NotificationItem {
    const optional = {
      lessonId: notification.lessonId,
      lessonTitle: notification.lessonTitle,
      questionId: notification.questionId,
      actorName: notification.actorName,
      readAt: notification.readAt?.toISOString(),
    };

    return new NotificationItem({
      id: notification.id,
      accountId: notification.accountId,
      kind: notification.kind,
      courseId: notification.courseId,
      courseTitle: notification.courseTitle,
      byInstructor: notification.byInstructor,
      createdAt: notification.createdAt.toISOString(),
      expiresAt: nowInSeconds(notification.expiresAt.getTime()),
      ...Object.fromEntries(
        Object.entries(optional).filter(([, value]) => value !== undefined),
      ),
    });
  }

  static toEntity(item: NotificationItem.ItemType): Notification {
    return new Notification({
      id: item.id,
      accountId: item.accountId,
      kind: item.kind,
      courseId: item.courseId,
      courseTitle: item.courseTitle,
      lessonId: item.lessonId,
      lessonTitle: item.lessonTitle,
      questionId: item.questionId,
      actorName: item.actorName,
      byInstructor: item.byInstructor,
      readAt: item.readAt === undefined ? undefined : new Date(item.readAt),
      createdAt: new Date(item.createdAt),
    });
  }

  static getPK(accountId: Account.Id): NotificationItem.Keys['PK'] {
    return `INBOX#${accountId}`;
  }

  static getSK(id: Notification.Id): NotificationItem.Keys['SK'] {
    return `NOTIFICATION#${id}`;
  }

  static getGSI1PK(
    accountId: Account.Id,
  ): NonNullable<NotificationItem.Keys['GSI1PK']> {
    return `UNREAD#${accountId}`;
  }
}

export namespace NotificationItem {
  export interface Keys {
    PK: `INBOX#${string}`;
    SK: `NOTIFICATION#${string}`;
    GSI1PK?: `UNREAD#${string}`;
    GSI1SK?: `NOTIFICATION#${string}`;
  }

  export interface Attributes {
    id: Notification.Id;
    accountId: Account.Id;
    kind: Notification.Kind;
    courseId: Course.Id;
    courseTitle: string;
    lessonId?: Lesson.Id;
    lessonTitle?: string;
    questionId?: Question.Id;
    actorName?: string;
    byInstructor: boolean;
    readAt?: string;
    createdAt: string;
    expiresAt: number;
  }

  export type ItemType = Keys & Attributes & { type: 'Notification' };
}
