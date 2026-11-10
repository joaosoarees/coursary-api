import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { paginationSchema } from '@application/controllers/shared/schemas';
import type { QuestionSummary } from '@application/queries/question/QuestionSummary';
import { permissions } from '@application/security/permissions';
import type { ListQuestionsUseCase } from '@application/usecases/question/ListQuestionsUseCase';

export class ListQuestionsController extends Controller<
  'private',
  Page<QuestionSummary>
> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listQuestions: ListQuestionsUseCase) {
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
    ListQuestionsController.Params,
    ListQuestionsController.QueryParams
  >): Promise<Controller.Response<Page<QuestionSummary>>> {
    const page = await this.listQuestions.execute({
      callerId: accountId,
      callerRole: role,
      ...params,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListQuestionsController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type QueryParams = z.infer<typeof paginationSchema>;
}
