import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { GetMyReviewUseCase } from '@application/usecases/review/GetMyReviewUseCase';
import type { ReviewDetails } from '@application/usecases/review/ReviewDetails';

export class GetMyReviewController extends Controller<
  'private',
  ReviewDetails
> {
  protected override readonly permission = permissions.CoursesReview;

  protected override readonly paramsSchema = courseIdParamsSchema;

  constructor(private readonly getMyReview: GetMyReviewUseCase) {
    super();
  }

  protected async handle({
    accountId,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    GetMyReviewController.Params
  >): Promise<Controller.Response<ReviewDetails>> {
    const review = await this.getMyReview.execute({
      callerId: accountId,
      courseId: params.courseId,
    });

    return { statusCode: 200, body: review };
  }
}

export namespace GetMyReviewController {
  export type Params = z.infer<typeof courseIdParamsSchema>;
}
