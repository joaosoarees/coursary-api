import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import {
  courseIdParamsSchema,
  paginationSchema,
} from '@application/controllers/shared/schemas';
import type { ReviewSummary } from '@application/queries/review/ReviewSummary';
import type { ListCourseReviewsUseCase } from '@application/usecases/review/ListCourseReviewsUseCase';

export class ListCourseReviewsController extends Controller<
  'public',
  Page<ReviewSummary>
> {
  protected override readonly paramsSchema = courseIdParamsSchema;

  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listCourseReviews: ListCourseReviewsUseCase) {
    super();
  }

  protected async handle({
    params,
    queryParams,
  }: Controller.Request<
    'public',
    Record<string, unknown>,
    ListCourseReviewsController.Params,
    ListCourseReviewsController.QueryParams
  >): Promise<Controller.Response<Page<ReviewSummary>>> {
    const page = await this.listCourseReviews.execute({
      courseId: params.courseId,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListCourseReviewsController {
  export type Params = z.infer<typeof courseIdParamsSchema>;

  export type QueryParams = z.infer<typeof paginationSchema>;
}
