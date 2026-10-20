import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { reviewSchema } from '@application/controllers/review/schemas';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { ReviewCourseUseCase } from '@application/usecases/review/ReviewCourseUseCase';
import type { ReviewDetails } from '@application/usecases/review/ReviewDetails';

export class ReviewCourseController extends Controller<
  'private',
  ReviewDetails
> {
  protected override readonly permission = permissions.CoursesReview;

  protected override readonly paramsSchema = courseIdParamsSchema;

  protected override readonly bodySchema = reviewSchema;

  constructor(private readonly reviewCourse: ReviewCourseUseCase) {
    super();
  }

  protected async handle({
    account,
    params,
    body,
  }: Controller.Request<
    'private',
    ReviewCourseController.Body,
    ReviewCourseController.Params
  >): Promise<Controller.Response<ReviewDetails>> {
    const { review, created } = await this.reviewCourse.execute({
      student: account,
      courseId: params.courseId,
      ...body,
    });

    return { statusCode: created ? 201 : 200, body: review };
  }
}

export namespace ReviewCourseController {
  export type Body = z.infer<typeof reviewSchema>;

  export type Params = z.infer<typeof courseIdParamsSchema>;
}
