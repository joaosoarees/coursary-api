import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import { listAccountsSchema } from '@application/controllers/admin/schemas';
import type { AccountSummary } from '@application/queries/admin/AccountSummary';
import { permissions } from '@application/security/permissions';
import type { ListAccountsUseCase } from '@application/usecases/admin/ListAccountsUseCase';

export class ListAccountsController extends Controller<
  'private',
  Page<AccountSummary>
> {
  protected override readonly permission = permissions.UsersList;

  protected override readonly queryParamsSchema = listAccountsSchema;

  constructor(private readonly listAccounts: ListAccountsUseCase) {
    super();
  }

  protected async handle({
    queryParams,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    Record<string, unknown>,
    ListAccountsController.QueryParams
  >): Promise<Controller.Response<Page<AccountSummary>>> {
    const page = await this.listAccounts.execute(queryParams);

    return { statusCode: 200, body: page };
  }
}

export namespace ListAccountsController {
  export type QueryParams = z.infer<typeof listAccountsSchema>;
}
