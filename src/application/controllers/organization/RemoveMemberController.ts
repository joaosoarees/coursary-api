import type { z } from 'zod';

import type { Controller } from '@application/contracts/Controller';
import { OrgController } from '@application/contracts/OrgController';
import { memberParamsSchema } from '@application/controllers/organization/schemas';
import type { RemoveMemberUseCase } from '@application/usecases/organization/RemoveMemberUseCase';

export class RemoveMemberController extends OrgController {
  protected override readonly orgRoles = ['OWNER', 'ADMIN'] as const;

  protected override readonly paramsSchema = memberParamsSchema;

  constructor(private readonly removeMember: RemoveMemberUseCase) {
    super();
  }

  protected async handle({
    membership,
    params,
  }: Controller.Request<
    'org',
    Record<string, unknown>,
    RemoveMemberController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.removeMember.execute({
      actor: membership,
      accountId: params.accountId,
    });

    return { statusCode: 204 };
  }
}

export namespace RemoveMemberController {
  export type Params = z.infer<typeof memberParamsSchema>;
}
