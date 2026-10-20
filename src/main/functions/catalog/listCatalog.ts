import { ListCatalogController } from '@application/controllers/catalog/ListCatalogController';
import { ListCatalogUseCase } from '@application/usecases/catalog/ListCatalogUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCatalogQuery } from '@main/factories/makeCatalogQuery';

const catalogQuery = makeCatalogQuery();
const listCatalogUseCase = new ListCatalogUseCase(catalogQuery);
const controller = new ListCatalogController(listCatalogUseCase);

export const handler = lambdaHttpAdapter(controller);
