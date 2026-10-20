import type { Page } from '@application/contracts/Page';
import type { CatalogItem } from '@application/queries/catalog/CatalogItem';

export interface CatalogQuery {
  execute: (page: Page.Options) => Promise<Page<CatalogItem>>;
}
