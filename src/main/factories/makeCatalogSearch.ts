import type { CatalogSearch } from '@application/gateways/catalog/CatalogSearch';
import { AlgoliaCatalogSearch } from '@infra/gateways/catalog/AlgoliaCatalogSearch';
import { AlgoliaConnection } from '@infra/gateways/catalog/AlgoliaConnection';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCatalogSearch(): CatalogSearch {
  const appConfig = makeAppConfig();

  return new AlgoliaCatalogSearch(
    appConfig,
    new AlgoliaConnection(appConfig, 'search-key'),
  );
}
