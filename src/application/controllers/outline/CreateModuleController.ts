import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { moduleBodySchema } from '@application/controllers/outline/schemas';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { CreateModuleUseCase } from '@application/usecases/outline/CreateModuleUseCase';
import type { ModuleDetails } from '@application/usecases/outline/ModuleDetails';

export class CreateModuleController extends Controller<
  'private',
  ModuleDetails
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = courseIdParamsSchema;

  protected override readonly bodySchema = moduleBodySchema;

  constructor(private readonly createModule: CreateModuleUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    CreateModuleController.Body,
    CreateModuleController.Params
  >): Promise<Controller.Response<ModuleDetails>> {
    const result = await this.createModule.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      title: body.title,
    });

    return { statusCode: 201, body: result };
  }
}

export namespace CreateModuleController {
  export type Params = z.infer<typeof courseIdParamsSchema>;

  export type Body = z.infer<typeof moduleBodySchema>;
}
