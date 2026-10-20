import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import {
  createLessonSchema,
  moduleParamsSchema,
} from '@application/controllers/outline/schemas';
import { permissions } from '@application/security/permissions';
import type { CreateLessonUseCase } from '@application/usecases/outline/CreateLessonUseCase';
import type { LessonDetails } from '@application/usecases/outline/LessonDetails';

export class CreateLessonController extends Controller<
  'private',
  LessonDetails
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = moduleParamsSchema;

  protected override readonly bodySchema = createLessonSchema;

  constructor(private readonly createLesson: CreateLessonUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    CreateLessonController.Body,
    CreateLessonController.Params
  >): Promise<Controller.Response<LessonDetails>> {
    const result = await this.createLesson.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      moduleId: params.moduleId,
      ...body,
    });

    return { statusCode: 201, body: result };
  }
}

export namespace CreateLessonController {
  export type Params = z.infer<typeof moduleParamsSchema>;

  export type Body = z.infer<typeof createLessonSchema>;
}
