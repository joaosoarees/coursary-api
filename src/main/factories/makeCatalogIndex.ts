import type { CatalogIndex } from '@application/gateways/catalog/CatalogIndex';
import { AlgoliaCatalogIndex } from '@infra/gateways/catalog/AlgoliaCatalogIndex';
import { AlgoliaConnection } from '@infra/gateways/catalog/AlgoliaConnection';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCatalogIndex(): CatalogIndex {
  const appConfig = makeAppConfig();

  return new AlgoliaCatalogIndex(
    appConfig,
    new AlgoliaConnection(appConfig, 'write-key'),
  );
}
