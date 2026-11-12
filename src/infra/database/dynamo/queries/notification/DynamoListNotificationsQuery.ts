import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { Notification } from '@application/entities/notification/Notification';
import type { ListNotificationsQuery } from '@application/queries/notification/ListNotificationsQuery';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { NotificationItem } from '@infra/database/dynamo/items/notification/NotificationItem';
import { nowInSeconds } from '@infra/database/dynamo/ttl';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoListNotificationsQuery implements ListNotificationsQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    accountId,
    now,
    page,
  }: ListNotificationsQuery.Input): Promise<Page<Notification>> {
    const PK = NotificationItem.getPK(accountId);
    const pagination = new DynamoPagination(
      z.strictObject({
        PK: z.literal(PK),
        SK: z.string().startsWith('NOTIFICATION#'),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<NotificationItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          FilterExpression: 'expiresAt > :now',
          ExpressionAttributeValues: {
            ':pk': PK,
            ':prefix': 'NOTIFICATION#',
            ':now': nowInSeconds(now.getTime()),
          },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) => NotificationItem.toEntity(item)),
      nextCursor,
    };
  }
}
