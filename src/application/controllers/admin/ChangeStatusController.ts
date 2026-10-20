import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { accountIdParamsSchema } from '@application/controllers/admin/schemas';
import { permissions } from '@application/security/permissions';
import type { ChangeStatusUseCase } from '@application/usecases/admin/ChangeStatusUseCase';

export class ChangeStatusController extends Controller<
  'private',
  ChangeStatusUseCase.Output
> {
  protected override readonly permission = permissions.UsersChangeStatus;

  protected override readonly paramsSchema = accountIdParamsSchema;

  constructor(
    private readonly changeStatus: ChangeStatusUseCase,
    private readonly status: ChangeStatusUseCase.Status,
  ) {
    super();
  }

  protected async handle({
    accountId,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    ChangeStatusController.Params
  >): Promise<Controller.Response<ChangeStatusUseCase.Output>> {
    const changed = await this.changeStatus.execute({
      callerId: accountId,
      accountId: params.accountId,
      status: this.status,
    });

    return { statusCode: 200, body: changed };
  }
}

export namespace ChangeStatusController {
  export type Params = z.infer<typeof accountIdParamsSchema>;
}
