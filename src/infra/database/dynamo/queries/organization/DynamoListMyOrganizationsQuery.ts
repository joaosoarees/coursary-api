import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { ListMyOrganizationsQuery } from '@application/queries/organization/ListMyOrganizationsQuery';
import { OrganizationSummary } from '@application/queries/organization/OrganizationSummary';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { MembershipItem } from '@infra/database/dynamo/items/organization/MembershipItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoListMyOrganizationsQuery implements ListMyOrganizationsQuery {
  constructor(private readonly config: AppConfig) {}

  async execute({
    accountId,
    page,
  }: ListMyOrganizationsQuery.Input): Promise<Page<OrganizationSummary>> {
    const GSI1PK = MembershipItem.getGSI1PK(accountId);
    const pagination = new DynamoPagination(
      z.strictObject({
        GSI1PK: z.literal(GSI1PK),
        GSI1SK: z.string().startsWith('ORG#'),
        PK: z.string().startsWith('ORG#'),
        SK: z.literal(MembershipItem.getSK(accountId)),
      }),
    );

    const { items, nextCursor } =
      await pagination.queryPage<MembershipItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': GSI1PK },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) =>
        OrganizationSummary.fromMembership(MembershipItem.toEntity(item)),
      ),
      nextCursor,
    };
  }
}
