import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import {
  courseIdParamsSchema,
  paginationSchema,
} from '@application/controllers/shared/schemas';
import type { StudentSummary } from '@application/queries/enrollment/StudentSummary';
import { permissions } from '@application/security/permissions';
import type { ListCourseStudentsUseCase } from '@application/usecases/enrollment/ListCourseStudentsUseCase';

export class ListCourseStudentsController extends Controller<
  'private',
  Page<StudentSummary>
> {
  protected override readonly permission = permissions.CoursesListStudents;

  protected override readonly paramsSchema = courseIdParamsSchema;

  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listCourseStudents: ListCourseStudentsUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    queryParams,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    ListCourseStudentsController.Params,
    ListCourseStudentsController.QueryParams
  >): Promise<Controller.Response<Page<StudentSummary>>> {
    const page = await this.listCourseStudents.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListCourseStudentsController {
  export type Params = z.infer<typeof courseIdParamsSchema>;

  export type QueryParams = z.infer<typeof paginationSchema>;
}
