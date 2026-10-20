import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import { paginationSchema } from '@application/controllers/shared/schemas';
import type { CatalogItem } from '@application/queries/catalog/CatalogItem';
import type { ListCatalogUseCase } from '@application/usecases/catalog/ListCatalogUseCase';

export class ListCatalogController extends Controller<
  'public',
  Page<CatalogItem>
> {
  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listCatalog: ListCatalogUseCase) {
    super();
  }

  protected async handle({
    queryParams,
  }: Controller.Request<
    'public',
    Record<string, unknown>,
    Record<string, unknown>,
    ListCatalogController.QueryParams
  >): Promise<Controller.Response<Page<CatalogItem>>> {
    const page = await this.listCatalog.execute(queryParams);

    return { statusCode: 200, body: page };
  }
}

export namespace ListCatalogController {
  export type QueryParams = z.infer<typeof paginationSchema>;
}
