import { describe, expect, it, vi } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Course } from '@application/entities/course/Course';
import { DynamoPagination } from '@infra/database/dynamo/DynamoPagination';
import { CourseItem } from '@infra/database/dynamo/items/course/CourseItem';
import { DynamoCatalogQuery } from '@infra/database/dynamo/queries/catalog/DynamoCatalogQuery';
import { AppConfig } from '@shared/config/AppConfig';

const instructor = Account.create({ name: 'Ana', email: 'ana@example.com' });

const publishedAt = (minute: number) =>
  new Date(Date.UTC(2025, 0, 1, 10, minute)).toISOString();

const itemIn = (GSI2PK: string, minute: number): CourseItem.ItemType => {
  const course = Course.create({ instructor, title: `At ${String(minute)}` });

  return {
    ...CourseItem.fromEntity(course).toItem(),
    status: 'PUBLISHED',
    publishedAt: publishedAt(minute),
    GSI2PK: GSI2PK as CourseItem.Keys['GSI2PK'],
    GSI2SK: `${publishedAt(minute)}#${course.id}`,
  };
};

describe('DynamoCatalogQuery', () => {
  // DynamoDB Local does not cut a page at its read budget, so the cut is staged here.
  it('should stop at the last item a partition cut short has read', async () => {
    const cut = [itemIn('CATALOG#0', 9), itemIn('CATALOG#0', 8)];
    const whole = [7, 6, 5].map((minute) => itemIn('CATALOG#1', minute));
    vi.stubEnv('MAIN_TABLE_NAME', 'catalog-table');
    vi.spyOn(DynamoPagination.prototype, 'queryPage').mockImplementation(
      (input) => {
        const pk = input.ExpressionAttributeValues?.[':pk'] as string;

        return Promise.resolve(
          pk === 'CATALOG#0'
            ? { items: cut, nextCursor: 'more' }
            : { items: pk === 'CATALOG#1' ? whole : [], nextCursor: null },
        );
      },
    );

    const page = await new DynamoCatalogQuery(new AppConfig()).execute({
      limit: 3,
    });

    expect(page.items.map((item) => item.id)).toEqual(
      cut.map((item) => item.id),
    );
    expect(
      JSON.parse(
        Buffer.from(page.nextCursor ?? '', 'base64url').toString('utf8'),
      ),
    ).toEqual({ after: cut[1]?.GSI2SK });
  });
});
