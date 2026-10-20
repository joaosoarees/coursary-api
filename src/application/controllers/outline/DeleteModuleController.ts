import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { moduleParamsSchema } from '@application/controllers/outline/schemas';
import { permissions } from '@application/security/permissions';
import type { DeleteModuleUseCase } from '@application/usecases/outline/DeleteModuleUseCase';

export class DeleteModuleController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = moduleParamsSchema;

  constructor(private readonly deleteModule: DeleteModuleUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    DeleteModuleController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.deleteModule.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      moduleId: params.moduleId,
    });

    return { statusCode: 204 };
  }
}

export namespace DeleteModuleController {
  export type Params = z.infer<typeof moduleParamsSchema>;
}
