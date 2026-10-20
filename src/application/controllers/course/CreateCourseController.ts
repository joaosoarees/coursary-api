import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { createCourseSchema } from '@application/controllers/course/schemas';
import { permissions } from '@application/security/permissions';
import type { CourseDetails } from '@application/usecases/course/CourseDetails';
import type { CreateCourseUseCase } from '@application/usecases/course/CreateCourseUseCase';

export class CreateCourseController extends Controller<
  'private',
  CourseDetails
> {
  protected override readonly permission = permissions.CoursesCreate;

  protected override readonly bodySchema = createCourseSchema;

  constructor(private readonly createCourse: CreateCourseUseCase) {
    super();
  }

  protected async handle({
    account,
    body,
  }: Controller.Request<'private', CreateCourseController.Body>): Promise<
    Controller.Response<CourseDetails>
  > {
    const course = await this.createCourse.execute({
      instructor: account,
      ...body,
    });

    return { statusCode: 201, body: course };
  }
}

export namespace CreateCourseController {
  export type Body = z.infer<typeof createCourseSchema>;
}
