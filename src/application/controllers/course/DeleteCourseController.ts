import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { DeleteCourseUseCase } from '@application/usecases/course/DeleteCourseUseCase';

// 202: the course is gone for the API now; its content goes in the background (Q368).
export class DeleteCourseController extends Controller<
  'private',
  DeleteCourseUseCase.Output
> {
  protected override readonly permission = permissions.CoursesDelete;

  protected override readonly paramsSchema = courseIdParamsSchema;

  constructor(private readonly deleteCourse: DeleteCourseUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    DeleteCourseController.Params
  >): Promise<Controller.Response<DeleteCourseUseCase.Output>> {
    const deleting = await this.deleteCourse.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
    });

    return { statusCode: 202, body: deleting };
  }
}

export namespace DeleteCourseController {
  export type Params = z.infer<typeof courseIdParamsSchema>;
}
