import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { findAccountByEmailSchema } from '@application/controllers/admin/schemas';
import type { AccountSummary } from '@application/queries/admin/AccountSummary';
import { permissions } from '@application/security/permissions';
import type { FindAccountByEmailUseCase } from '@application/usecases/admin/FindAccountByEmailUseCase';

export class FindAccountByEmailController extends Controller<
  'private',
  AccountSummary
> {
  protected override readonly permission = permissions.UsersRead;

  protected override readonly queryParamsSchema = findAccountByEmailSchema;

  constructor(private readonly findAccountByEmail: FindAccountByEmailUseCase) {
    super();
  }

  protected async handle({
    queryParams,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    Record<string, unknown>,
    FindAccountByEmailController.QueryParams
  >): Promise<Controller.Response<AccountSummary>> {
    const account = await this.findAccountByEmail.execute(queryParams);

    return { statusCode: 200, body: account };
  }
}

export namespace FindAccountByEmailController {
  export type QueryParams = z.infer<typeof findAccountByEmailSchema>;
}
