import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import {
  lessonParamsSchema,
  updateLessonSchema,
} from '@application/controllers/outline/schemas';
import { permissions } from '@application/security/permissions';
import type { LessonDetails } from '@application/usecases/outline/LessonDetails';
import type { UpdateLessonUseCase } from '@application/usecases/outline/UpdateLessonUseCase';

export class UpdateLessonController extends Controller<
  'private',
  LessonDetails
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly bodySchema = updateLessonSchema;

  constructor(private readonly updateLesson: UpdateLessonUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    UpdateLessonController.Body,
    UpdateLessonController.Params
  >): Promise<Controller.Response<LessonDetails>> {
    const result = await this.updateLesson.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      moduleId: params.moduleId,
      lessonId: params.lessonId,
      changes: body,
    });

    return { statusCode: 200, body: result };
  }
}

export namespace UpdateLessonController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type Body = z.infer<typeof updateLessonSchema>;
}
