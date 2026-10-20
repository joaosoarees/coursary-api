import KSUID from 'ksuid';

import { Course } from '@application/entities/course/Course';
import type { CatalogIndexQueue } from '@application/gateways/catalog/CatalogIndexQueue';
import type { CatalogQuery } from '@application/queries/catalog/CatalogQuery';

// Queues every published course again; the indexer copies its current state (Q318).
export class ReindexCatalogUseCase {
  static readonly pageSize = 100;

  constructor(
    private readonly catalog: CatalogQuery,
    private readonly catalogIndexQueue: CatalogIndexQueue,
  ) {}

  async execute(): Promise<ReindexCatalogUseCase.Output> {
    // A new run is never mistaken for a repeat of the last one.
    const run = KSUID.randomSync().string;
    let cursor: string | undefined;
    let queued = 0;

    do {
      const page = await this.catalog.execute({
        limit: ReindexCatalogUseCase.pageSize,
        cursor,
      });
      await this.catalogIndexQueue.enqueue(
        page.items.map((item) => ({
          courseId: Course.toId(item.id),
          deduplicationId: `reindex-${run}-${item.id}`,
        })),
      );
      queued += page.items.length;
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    return { queued };
  }
}

export namespace ReindexCatalogUseCase {
  export interface Output {
    queued: number;
  }
}
