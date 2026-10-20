import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { permissions } from '@application/security/permissions';
import type { CompleteLessonUseCase } from '@application/usecases/enrollment/CompleteLessonUseCase';

export class CompleteLessonController extends Controller<
  'private',
  CompleteLessonController.Response
> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly paramsSchema = lessonParamsSchema;

  constructor(private readonly completeLesson: CompleteLessonUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    CompleteLessonController.Params
  >): Promise<Controller.Response<CompleteLessonController.Response>> {
    const { created, ...body } = await this.completeLesson.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
    });

    return { statusCode: created ? 201 : 200, body };
  }
}

export namespace CompleteLessonController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type Response = Omit<CompleteLessonUseCase.Output, 'created'>;
}
