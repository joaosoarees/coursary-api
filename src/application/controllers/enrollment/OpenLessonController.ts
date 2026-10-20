import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { permissions } from '@application/security/permissions';
import type { LessonContentDetails } from '@application/usecases/enrollment/LessonContentDetails';
import type { OpenLessonUseCase } from '@application/usecases/enrollment/OpenLessonUseCase';

export class OpenLessonController extends Controller<
  'private',
  LessonContentDetails
> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly paramsSchema = lessonParamsSchema;

  constructor(private readonly openLesson: OpenLessonUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    OpenLessonController.Params
  >): Promise<Controller.Response<LessonContentDetails>> {
    const lesson = await this.openLesson.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
    });

    return { statusCode: 200, body: lesson };
  }
}

export namespace OpenLessonController {
  export type Params = z.infer<typeof lessonParamsSchema>;
}
