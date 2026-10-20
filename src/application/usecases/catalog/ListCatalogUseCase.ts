import type { Page } from '@application/contracts/Page';
import type { CatalogItem } from '@application/queries/catalog/CatalogItem';
import type { CatalogQuery } from '@application/queries/catalog/CatalogQuery';

export class ListCatalogUseCase {
  constructor(private readonly catalog: CatalogQuery) {}

  execute(page: ListCatalogUseCase.Input): Promise<Page<CatalogItem>> {
    return this.catalog.execute(page);
  }
}

export namespace ListCatalogUseCase {
  export type Input = Page.Options;
}
