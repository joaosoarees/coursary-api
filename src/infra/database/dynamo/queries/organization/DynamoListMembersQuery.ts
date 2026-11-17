import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { ListMembersQuery } from '@application/queries/organization/ListMembersQuery';
import { MemberSummary } from '@application/queries/organization/MemberSummary';
import { batchGetAll } from '@infra/database/dynamo/batchGetAll';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { MembershipItem } from '@infra/database/dynamo/items/organization/MembershipItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoListMembersQuery implements ListMembersQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    orgId,
    page,
  }: ListMembersQuery.Input): Promise<Page<MemberSummary>> {
    const PK = MembershipItem.getPK(orgId);
    const pagination = new DynamoPagination(
      z.strictObject({
        PK: z.literal(PK),
        SK: z.string().startsWith('MEMBER#'),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<MembershipItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': PK, ':prefix': 'MEMBER#' },
        },
        page,
      );
    const accounts = new Map(
      (
        (await batchGetAll.read(
          this.config.mainTableName,
          items.map(({ accountId }) => ({
            PK: AccountItem.getPK(accountId),
            SK: AccountItem.getSK(accountId),
          })),
          'accounts',
        )) as AccountItem.ItemType[]
      ).map((item) => [item.id, AccountItem.toEntity(item)]),
    );

    return {
      items: items.flatMap((item) => {
        const account = accounts.get(item.accountId);

        if (!account) {
          console.warn({
            event: 'MembershipWithoutAccount',
            orgId,
            accountId: item.accountId,
          });
          return [];
        }

        return [
          MemberSummary.fromMembership(MembershipItem.toEntity(item), account),
        ];
      }),
      nextCursor,
    };
  }
}
