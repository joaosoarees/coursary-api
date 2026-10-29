import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { permissions } from '@application/security/permissions';
import type { DeleteVideoUseCase } from '@application/usecases/file/DeleteVideoUseCase';

export class DeleteVideoController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  constructor(private readonly deleteVideo: DeleteVideoUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    DeleteVideoController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.deleteVideo.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
    });

    return { statusCode: 204 };
  }
}

export namespace DeleteVideoController {
  export type Params = z.infer<typeof lessonParamsSchema>;
}
