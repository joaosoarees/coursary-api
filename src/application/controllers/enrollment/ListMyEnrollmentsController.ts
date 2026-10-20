import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import { paginationSchema } from '@application/controllers/shared/schemas';
import type { EnrollmentSummary } from '@application/queries/enrollment/EnrollmentSummary';
import { permissions } from '@application/security/permissions';
import type { ListMyEnrollmentsUseCase } from '@application/usecases/enrollment/ListMyEnrollmentsUseCase';

export class ListMyEnrollmentsController extends Controller<
  'private',
  Page<EnrollmentSummary>
> {
  protected override readonly permission = permissions.CoursesEnroll;

  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listMyEnrollments: ListMyEnrollmentsUseCase) {
    super();
  }

  protected async handle({
    accountId,
    queryParams,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    Record<string, unknown>,
    ListMyEnrollmentsController.QueryParams
  >): Promise<Controller.Response<Page<EnrollmentSummary>>> {
    const page = await this.listMyEnrollments.execute({
      callerId: accountId,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListMyEnrollmentsController {
  export type QueryParams = z.infer<typeof paginationSchema>;
}
