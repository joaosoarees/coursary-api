import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import type { CoursePage } from '@application/queries/catalog/CoursePage';
import type { GetCoursePageUseCase } from '@application/usecases/catalog/GetCoursePageUseCase';

export class GetCoursePageController extends Controller<'public', CoursePage> {
  protected override readonly paramsSchema = courseIdParamsSchema;

  constructor(private readonly getCoursePage: GetCoursePageUseCase) {
    super();
  }

  protected async handle({
    params,
  }: Controller.Request<
    'public',
    Record<string, unknown>,
    GetCoursePageController.Params
  >): Promise<Controller.Response<CoursePage>> {
    const page = await this.getCoursePage.execute({
      courseId: params.courseId,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace GetCoursePageController {
  export type Params = z.infer<typeof courseIdParamsSchema>;
}
