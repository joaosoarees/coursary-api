import { questionWorld } from '@tests/support/questionWorld';

import type { Account } from '@application/entities/account/Account';
import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import { DynamoListNotificationsQuery } from '@infra/database/dynamo/queries/notification/DynamoListNotificationsQuery';
import { DynamoNotificationRepository } from '@infra/database/dynamo/repositories/notification/DynamoNotificationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();

export async function notifyWorld() {
  const world = await questionWorld();
  const notifications = new DynamoNotificationRepository(config);
  const listNotifications = new DynamoListNotificationsQuery(config);
  const enqueued: NotificationQueue.Request[] = [];
  const notificationQueue: NotificationQueue = {
    enqueue: (requests) => {
      enqueued.push(...requests);

      return Promise.resolve();
    },
  };

  const inbox = async (account: Account) =>
    (
      await listNotifications.execute({
        accountId: account.id,
        now: new Date(),
        page: { limit: 100 },
      })
    ).items;

  return {
    ...world,
    notifications,
    notificationQueue,
    enqueued,
    inbox,
  };
}
