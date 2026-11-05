import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { CourseDetails } from '@application/usecases/course/CourseDetails';
import type { GetManagedCourseUseCase } from '@application/usecases/course/GetManagedCourseUseCase';

export class GetManagedCourseController extends Controller<
  'private',
  CourseDetails
> {
  protected override readonly permission = permissions.CoursesListOwn;

  protected override readonly paramsSchema = courseIdParamsSchema;

  constructor(private readonly getManagedCourse: GetManagedCourseUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    GetManagedCourseController.Params
  >): Promise<Controller.Response<CourseDetails>> {
    const course = await this.getManagedCourse.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
    });

    return { statusCode: 200, body: course };
  }
}

export namespace GetManagedCourseController {
  export type Params = z.infer<typeof courseIdParamsSchema>;
}
