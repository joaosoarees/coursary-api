import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/outline/schemas';
import { permissions } from '@application/security/permissions';
import type { DeleteLessonUseCase } from '@application/usecases/outline/DeleteLessonUseCase';

export class DeleteLessonController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  constructor(private readonly deleteLesson: DeleteLessonUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    DeleteLessonController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.deleteLesson.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      moduleId: params.moduleId,
      lessonId: params.lessonId,
    });

    return { statusCode: 204 };
  }
}

export namespace DeleteLessonController {
  export type Params = z.infer<typeof lessonParamsSchema>;
}
