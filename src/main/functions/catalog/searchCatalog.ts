import { SearchCatalogController } from '@application/controllers/catalog/SearchCatalogController';
import { SearchCatalogUseCase } from '@application/usecases/catalog/SearchCatalogUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCatalogSearch } from '@main/factories/makeCatalogSearch';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';

const catalogSearch = makeCatalogSearch();
const coursesRepository = makeCourseRepository();
const searchCatalogUseCase = new SearchCatalogUseCase(
  catalogSearch,
  coursesRepository,
);
const controller = new SearchCatalogController(searchCatalogUseCase);

export const handler = lambdaHttpAdapter(controller);
