import type { Notification } from '@application/entities/notification/Notification';

export class NotificationSummary {
  readonly id: string;
  readonly kind: Notification.Kind;
  readonly courseId: string;
  readonly courseTitle: string;
  readonly lessonId?: string;
  readonly lessonTitle?: string;
  readonly questionId?: string;
  readonly actorName?: string;
  readonly byInstructor: boolean;
  readonly read: boolean;
  readonly createdAt: string;

  constructor(attributes: NotificationSummary) {
    this.id = attributes.id;
    this.kind = attributes.kind;
    this.courseId = attributes.courseId;
    this.courseTitle = attributes.courseTitle;
    this.lessonId = attributes.lessonId;
    this.lessonTitle = attributes.lessonTitle;
    this.questionId = attributes.questionId;
    this.actorName = attributes.actorName;
    this.byInstructor = attributes.byInstructor;
    this.read = attributes.read;
    this.createdAt = attributes.createdAt;
  }

  static fromNotification(notification: Notification): NotificationSummary {
    return new NotificationSummary({
      id: notification.id,
      kind: notification.kind,
      courseId: notification.courseId,
      courseTitle: notification.courseTitle,
      lessonId: notification.lessonId,
      lessonTitle: notification.lessonTitle,
      questionId: notification.questionId,
      actorName: notification.actorName,
      byInstructor: notification.byInstructor,
      read: notification.isRead(),
      createdAt: notification.createdAt.toISOString(),
    });
  }
}
