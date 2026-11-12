import type { NotificationQueue } from '@application/gateways/notification/NotificationQueue';
import { SqsNotificationQueue } from '@infra/gateways/notification/SqsNotificationQueue';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeNotificationQueue(): NotificationQueue {
  const appConfig = makeAppConfig();

  return new SqsNotificationQueue(appConfig);
}
