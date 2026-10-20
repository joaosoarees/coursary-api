import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import {
  moduleBodySchema,
  moduleParamsSchema,
} from '@application/controllers/outline/schemas';
import { permissions } from '@application/security/permissions';
import type { ModuleDetails } from '@application/usecases/outline/ModuleDetails';
import type { UpdateModuleUseCase } from '@application/usecases/outline/UpdateModuleUseCase';

export class UpdateModuleController extends Controller<
  'private',
  ModuleDetails
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = moduleParamsSchema;

  protected override readonly bodySchema = moduleBodySchema;

  constructor(private readonly updateModule: UpdateModuleUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    UpdateModuleController.Body,
    UpdateModuleController.Params
  >): Promise<Controller.Response<ModuleDetails>> {
    const result = await this.updateModule.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      moduleId: params.moduleId,
      title: body.title,
    });

    return { statusCode: 200, body: result };
  }
}

export namespace UpdateModuleController {
  export type Params = z.infer<typeof moduleParamsSchema>;

  export type Body = z.infer<typeof moduleBodySchema>;
}
