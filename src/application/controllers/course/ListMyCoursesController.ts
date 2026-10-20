import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import { paginationSchema } from '@application/controllers/shared/schemas';
import type { CourseSummary } from '@application/queries/course/CourseSummary';
import { permissions } from '@application/security/permissions';
import type { ListMyCoursesUseCase } from '@application/usecases/course/ListMyCoursesUseCase';

export class ListMyCoursesController extends Controller<
  'private',
  Page<CourseSummary>
> {
  protected override readonly permission = permissions.CoursesListOwn;

  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listMyCourses: ListMyCoursesUseCase) {
    super();
  }

  protected async handle({
    accountId,
    queryParams,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    Record<string, unknown>,
    ListMyCoursesController.QueryParams
  >): Promise<Controller.Response<Page<CourseSummary>>> {
    const page = await this.listMyCourses.execute({
      callerId: accountId,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListMyCoursesController {
  export type QueryParams = z.infer<typeof paginationSchema>;
}
