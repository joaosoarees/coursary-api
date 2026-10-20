import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import { AccountSummary } from '@application/queries/admin/AccountSummary';
import type { ListAccountsByRoleQuery } from '@application/queries/admin/ListAccountsByRoleQuery';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { nowInSeconds } from '@infra/database/dynamo/ttl';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoListAccountsByRoleQuery implements ListAccountsByRoleQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    role,
    status,
    page,
  }: ListAccountsByRoleQuery.Input): Promise<Page<AccountSummary>> {
    const GSI1PK = AccountItem.getGSI1PK(role);
    const pagination = new DynamoPagination(
      z.strictObject({
        GSI1PK: z.literal(GSI1PK),
        GSI1SK: z.string().startsWith('ACCOUNT#'),
        PK: z.string().startsWith('ACCOUNT#'),
        SK: z.string().startsWith('ACCOUNT#'),
      }),
    );
    const live = '(attribute_not_exists(expiresAt) OR expiresAt >= :now)';

    const { items, nextCursor } =
      await pagination.queryPage<AccountItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          FilterExpression: status ? `${live} AND #status = :status` : live,
          ExpressionAttributeNames: status
            ? { '#status': 'status' }
            : undefined,
          ExpressionAttributeValues: {
            ':pk': GSI1PK,
            ':now': nowInSeconds(),
            ...(status ? { ':status': status } : {}),
          },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) =>
        AccountSummary.fromAccount(AccountItem.toEntity(item)),
      ),
      nextCursor,
    };
  }
}
