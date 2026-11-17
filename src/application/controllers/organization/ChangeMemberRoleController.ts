import type { z } from 'zod';

import type { Controller } from '@application/contracts/Controller';
import { OrgController } from '@application/contracts/OrgController';
import {
  changeMemberRoleSchema,
  memberParamsSchema,
} from '@application/controllers/organization/schemas';
import type { ChangeMemberRoleUseCase } from '@application/usecases/organization/ChangeMemberRoleUseCase';

export class ChangeMemberRoleController extends OrgController<ChangeMemberRoleUseCase.Result> {
  protected override readonly orgRoles = ['OWNER'] as const;

  protected override readonly paramsSchema = memberParamsSchema;

  protected override readonly bodySchema = changeMemberRoleSchema;

  constructor(private readonly changeMemberRole: ChangeMemberRoleUseCase) {
    super();
  }

  protected async handle({
    membership,
    params,
    body,
  }: Controller.Request<
    'org',
    ChangeMemberRoleController.Body,
    ChangeMemberRoleController.Params
  >): Promise<Controller.Response<ChangeMemberRoleUseCase.Result>> {
    const changed = await this.changeMemberRole.execute({
      actor: membership,
      accountId: params.accountId,
      role: body.role,
    });

    return { statusCode: 200, body: changed };
  }
}

export namespace ChangeMemberRoleController {
  export type Body = z.infer<typeof changeMemberRoleSchema>;

  export type Params = z.infer<typeof memberParamsSchema>;
}
