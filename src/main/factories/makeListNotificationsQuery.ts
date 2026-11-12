import type { ListNotificationsQuery } from '@application/queries/notification/ListNotificationsQuery';
import { DynamoListNotificationsQuery } from '@infra/database/dynamo/queries/notification/DynamoListNotificationsQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListNotificationsQuery(): ListNotificationsQuery {
  const appConfig = makeAppConfig();

  return new DynamoListNotificationsQuery(appConfig);
}
