import type { CatalogIndexQueue } from '@application/gateways/catalog/CatalogIndexQueue';
import { SqsCatalogIndexQueue } from '@infra/gateways/catalog/SqsCatalogIndexQueue';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCatalogIndexQueue(): CatalogIndexQueue {
  const appConfig = makeAppConfig();

  return new SqsCatalogIndexQueue(appConfig);
}
