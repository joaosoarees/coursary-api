import { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { CatalogSearch } from '@application/gateways/catalog/CatalogSearch';
import type { SearchCatalogUseCase } from '@application/usecases/catalog/SearchCatalogUseCase';

// Pages count from 0 (Q297) and must start within the results a query can page (Q327).
export const searchSchema = z
  .object({
    q: z.string().trim().min(1).max(200),
    page: z.coerce.number().int().min(0).default(0),
    perPage: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine(({ page, perPage }) => page * perPage < CatalogSearch.maxResults, {
    path: ['page'],
    message: `Only the first ${String(CatalogSearch.maxResults)} results can be paged.`,
  });

export class SearchCatalogController extends Controller<
  'public',
  SearchCatalogUseCase.Output
> {
  protected override readonly queryParamsSchema = searchSchema;

  constructor(private readonly searchCatalog: SearchCatalogUseCase) {
    super();
  }

  protected async handle({
    queryParams,
  }: Controller.Request<
    'public',
    Record<string, unknown>,
    Record<string, unknown>,
    SearchCatalogController.QueryParams
  >): Promise<Controller.Response<SearchCatalogUseCase.Output>> {
    const { q, page, perPage } = queryParams;
    const result = await this.searchCatalog.execute({
      query: q,
      page,
      perPage,
    });

    return { statusCode: 200, body: result };
  }
}

export namespace SearchCatalogController {
  export type QueryParams = z.infer<typeof searchSchema>;
}
