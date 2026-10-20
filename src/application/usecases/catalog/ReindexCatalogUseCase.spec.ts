import { describe, expect, it } from 'vitest';

import type { CatalogIndexQueue } from '@application/gateways/catalog/CatalogIndexQueue';
import type { CatalogItem } from '@application/queries/catalog/CatalogItem';
import { ReindexCatalogUseCase } from '@application/usecases/catalog/ReindexCatalogUseCase';

const item = (id: string) => ({ id: id.padEnd(27, '0') }) as CatalogItem;

describe('ReindexCatalogUseCase', () => {
  it('should queue every published course, page after page, once per run', async () => {
    const pages: Record<
      string,
      { items: CatalogItem[]; nextCursor: string | null }
    > = {
      first: { items: [item('c1'), item('c2')], nextCursor: 'p2' },
      p2: { items: [item('c3')], nextCursor: null },
    };
    const sent: CatalogIndexQueue.Request[] = [];
    const reindex = new ReindexCatalogUseCase(
      {
        execute: ({ cursor }) =>
          Promise.resolve(
            pages[cursor ?? 'first'] ?? { items: [], nextCursor: null },
          ),
      },
      {
        enqueue: (requests) => {
          sent.push(...requests);

          return Promise.resolve();
        },
      },
    );

    await expect(reindex.execute()).resolves.toEqual({ queued: 3 });
    expect(sent.map((request) => request.courseId)).toEqual(
      ['c1', 'c2', 'c3'].map((id) => id.padEnd(27, '0')),
    );
    expect(new Set(sent.map((request) => request.deduplicationId)).size).toBe(
      3,
    );

    const firstRun = sent[0]?.deduplicationId;
    sent.length = 0;
    await reindex.execute();
    expect(sent[0]?.deduplicationId).not.toBe(firstRun);
  });
});
