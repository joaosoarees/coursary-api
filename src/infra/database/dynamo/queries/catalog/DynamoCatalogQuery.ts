import { z } from 'zod';

import type { Page } from '@application/contracts/Page';
import type { PublicAssetUrls } from '@application/gateways/file/PublicAssetUrls';
import { CatalogItem } from '@application/queries/catalog/CatalogItem';
import type { CatalogQuery } from '@application/queries/catalog/CatalogQuery';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import { CdnAssetUrls } from '@infra/gateways/file/CdnAssetUrls';
import type { AppConfig } from '@shared/config/AppConfig';

const boundary = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z#\S+$/);

const cursorSchema = z
  .strictObject({ after: boundary })
  .transform(({ after }) => after);

const sortKey = (item: CourseItem.ItemType) => item.GSI2SK ?? '';

export class DynamoCatalogQuery implements CatalogQuery {
  private readonly partition = new DynamoPagination(
    z.strictObject({
      GSI2PK: z.string(),
      GSI2SK: z.string(),
      PK: z.string(),
      SK: z.string(),
    }),
  );

  constructor(
    private readonly config: AppConfig,
    private readonly assetUrls: PublicAssetUrls = new CdnAssetUrls(config),
  ) {}

  async execute({ limit, cursor }: Page.Options): Promise<Page<CatalogItem>> {
    const after = cursor
      ? DynamoPagination.decode(cursor, cursorSchema)
      : undefined;
    const partitions = await Promise.all(
      CourseItem.catalogGSI2PKs.map((pk) =>
        this.partition.queryPage<CourseItem.ItemType>(
          {
            TableName: this.config.mainTableName,
            IndexName: 'GSI2',
            KeyConditionExpression: after
              ? 'GSI2PK = :pk AND GSI2SK < :after'
              : 'GSI2PK = :pk',
            ExpressionAttributeValues: {
              ':pk': pk,
              ...(after ? { ':after': after } : {}),
            },
            ScanIndexForward: false,
          },
          { limit },
        ),
      ),
    );
    // A partition cut short by its read budget only vouches for the items down to the last it
    // read: an older item of another partition could pass its unread ones, which the next
    // page's boundary would then skip for good.
    const readDownTo = partitions
      .filter((partition) => partition.nextCursor !== null)
      .map((partition) => partition.items.at(-1))
      .reduce(
        (highest, item) =>
          item && sortKey(item) > highest ? sortKey(item) : highest,
        '',
      );
    const merged = partitions
      .flatMap((partition) => partition.items)
      .filter((item) => sortKey(item) >= readDownTo)
      .sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1));
    const items = merged.slice(0, limit);
    const last = items.at(-1);
    const more =
      merged.length > limit ||
      partitions.some((partition) => partition.nextCursor !== null);

    return {
      items: items.map((item) =>
        CatalogItem.fromCourse(CourseItem.toEntity(item), this.assetUrls),
      ),
      nextCursor:
        more && last ? DynamoPagination.encode({ after: sortKey(last) }) : null,
    };
  }
}
