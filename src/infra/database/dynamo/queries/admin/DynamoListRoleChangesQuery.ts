import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { ListRoleChangesQuery } from '@application/queries/admin/ListRoleChangesQuery';
import { RoleChangeSummary } from '@application/queries/admin/RoleChangeSummary';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { RoleChangeItem } from '@infra/database/dynamo/items/account/RoleChangeItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoListRoleChangesQuery implements ListRoleChangesQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    accountId,
    page,
  }: ListRoleChangesQuery.Input): Promise<Page<RoleChangeSummary>> {
    const PK = RoleChangeItem.getPK(accountId);
    const pagination = new DynamoPagination(
      z.strictObject({
        PK: z.literal(PK),
        SK: z.string().startsWith('ROLE_CHANGE#'),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<RoleChangeItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': PK, ':prefix': 'ROLE_CHANGE#' },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) =>
        RoleChangeSummary.fromRoleChange(RoleChangeItem.toEntity(item)),
      ),
      nextCursor,
    };
  }
}
