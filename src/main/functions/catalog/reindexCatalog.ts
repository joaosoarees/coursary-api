import { z } from 'zod';

import { ReindexCatalogUseCase } from '@application/usecases/catalog/ReindexCatalogUseCase';
import { lambdaInvokeAdapter } from '@main/adapters/lambdaInvokeAdapter';
import { makeCatalogIndexQueue } from '@main/factories/makeCatalogIndexQueue';
import { makeCatalogQuery } from '@main/factories/makeCatalogQuery';

// Takes no input; `sls invoke` may send none at all.
const schema = z.unknown();
const catalogQuery = makeCatalogQuery();
const catalogIndexQueue = makeCatalogIndexQueue();
const reindexCatalogUseCase = new ReindexCatalogUseCase(
  catalogQuery,
  catalogIndexQueue,
);

export const handler = lambdaInvokeAdapter(schema, reindexCatalogUseCase);
