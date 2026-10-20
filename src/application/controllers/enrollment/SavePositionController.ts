import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { savePositionSchema } from '@application/controllers/enrollment/schemas';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { SavePositionUseCase } from '@application/usecases/enrollment/SavePositionUseCase';

export class SavePositionController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly paramsSchema = courseIdParamsSchema;

  protected override readonly bodySchema = savePositionSchema;

  constructor(private readonly savePosition: SavePositionUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    SavePositionController.Body,
    SavePositionController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.savePosition.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      ...body,
    });

    return { statusCode: 204 };
  }
}

export namespace SavePositionController {
  export type Body = z.infer<typeof savePositionSchema>;

  export type Params = z.infer<typeof courseIdParamsSchema>;
}
