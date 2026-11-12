import KSUID from 'ksuid';

import { anAccountId } from '@tests/support/ids';

import { Course } from '@application/entities/course/Course';
import {
  Notification,
  notificationKinds,
} from '@application/entities/notification/Notification';
import { DynamoListNotificationsQuery } from '@infra/database/dynamo/queries/notification/DynamoListNotificationsQuery';
import { DynamoNotificationRepository } from '@infra/database/dynamo/repositories/notification/DynamoNotificationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();

export function notificationWorld() {
  const notifications = new DynamoNotificationRepository(config);
  const listNotifications = new DynamoListNotificationsQuery(config);
  const accountId = anAccountId();
  const courseId = Course.toId(KSUID.randomSync().string);

  const notice = (sourceId: string, occurredAt = new Date()) =>
    Notification.create({
      accountId,
      kind: notificationKinds.Question,
      courseId,
      courseTitle: 'DynamoDB',
      lessonId: undefined,
      lessonTitle: undefined,
      questionId: undefined,
      actorName: 'Bia',
      byInstructor: false,
      sourceId,
      occurredAt,
    });

  // Ids order by the second: a second apart, the newest-first order is certain.
  const storeOne = async (sourceId: string, secondsAgo = 0) => {
    const notification = notice(
      sourceId,
      new Date(Date.now() - secondsAgo * 1000),
    );
    await notifications.saveIfNew(notification);

    return notification;
  };

  const store = async (count: number) => {
    const stored: Notification[] = [];

    for (let i = 0; i < count; i++) {
      stored.push(await storeOne(`q-${String(i)}`, count - i));
    }

    return stored;
  };

  return {
    notifications,
    listNotifications,
    accountId,
    notice,
    storeOne,
    store,
  };
}
