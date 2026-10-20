import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { updateCourseSchema } from '@application/controllers/course/schemas';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { CourseDetails } from '@application/usecases/course/CourseDetails';
import type { UpdateCourseUseCase } from '@application/usecases/course/UpdateCourseUseCase';

export class UpdateCourseController extends Controller<
  'private',
  CourseDetails
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = courseIdParamsSchema;

  protected override readonly bodySchema = updateCourseSchema;

  constructor(private readonly updateCourse: UpdateCourseUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    UpdateCourseController.Body,
    UpdateCourseController.Params
  >): Promise<Controller.Response<CourseDetails>> {
    const course = await this.updateCourse.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      changes: body,
    });

    return { statusCode: 200, body: course };
  }
}

export namespace UpdateCourseController {
  export type Params = z.infer<typeof courseIdParamsSchema>;

  export type Body = z.infer<typeof updateCourseSchema>;
}
