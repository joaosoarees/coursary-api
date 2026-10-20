import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import { CatalogItem } from '@application/queries/catalog/CatalogItem';
import type { CatalogQuery } from '@application/queries/catalog/CatalogQuery';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import type { AppConfig } from '@shared/config/AppConfig';

export class DynamoCatalogQuery implements CatalogQuery {
  private readonly pagination = new DynamoPagination(
    z.strictObject({
      GSI2PK: z.literal(CourseItem.getGSI2PK()),
      GSI2SK: z.string().min(1),
      PK: z.string().startsWith('COURSE#'),
      SK: z.string().startsWith('COURSE#'),
    }),
  );

  constructor(private readonly config: AppConfig) {}

  async execute(page: Page.Options): Promise<Page<CatalogItem>> {
    const { items, nextCursor } =
      await this.pagination.queryPage<CourseItem.ItemType>(
        {
          TableName: this.config.mainTableName,
          IndexName: 'GSI2',
          KeyConditionExpression: 'GSI2PK = :pk',
          ExpressionAttributeValues: { ':pk': CourseItem.getGSI2PK() },
          ScanIndexForward: false,
        },
        page,
      );

    return {
      items: items.map((item) =>
        CatalogItem.fromCourse(CourseItem.toEntity(item)),
      ),
      nextCursor,
    };
  }
}
