import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import { paginationSchema } from '@application/controllers/shared/schemas';
import type { OrganizationSummary } from '@application/queries/organization/OrganizationSummary';
import type { ListMyOrganizationsUseCase } from '@application/usecases/organization/ListMyOrganizationsUseCase';

export class ListMyOrganizationsController extends Controller<
  'private',
  Page<OrganizationSummary>
> {
  protected override readonly queryParamsSchema = paginationSchema;

  constructor(
    private readonly listMyOrganizations: ListMyOrganizationsUseCase,
  ) {
    super();
  }

  protected async handle({
    accountId,
    queryParams,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    Record<string, unknown>,
    ListMyOrganizationsController.QueryParams
  >): Promise<Controller.Response<Page<OrganizationSummary>>> {
    const page = await this.listMyOrganizations.execute({
      callerId: accountId,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListMyOrganizationsController {
  export type QueryParams = z.infer<typeof paginationSchema>;
}
