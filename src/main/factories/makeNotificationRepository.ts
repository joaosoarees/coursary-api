import type { NotificationRepository } from '@application/repositories/notification/NotificationRepository';
import { DynamoNotificationRepository } from '@infra/database/dynamo/repositories/notification/DynamoNotificationRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeNotificationRepository(): NotificationRepository {
  const appConfig = makeAppConfig();

  return new DynamoNotificationRepository(appConfig);
}
