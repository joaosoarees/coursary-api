import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import type { CourseOutline } from '@application/queries/outline/CourseOutline';
import { permissions } from '@application/security/permissions';
import type { GetCourseOutlineUseCase } from '@application/usecases/outline/GetCourseOutlineUseCase';

export class GetCourseOutlineController extends Controller<
  'private',
  CourseOutline
> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly paramsSchema = courseIdParamsSchema;

  constructor(private readonly getCourseOutline: GetCourseOutlineUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    GetCourseOutlineController.Params
  >): Promise<Controller.Response<CourseOutline>> {
    const result = await this.getCourseOutline.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
    });

    return { statusCode: 200, body: result };
  }
}

export namespace GetCourseOutlineController {
  export type Params = z.infer<typeof courseIdParamsSchema>;
}
