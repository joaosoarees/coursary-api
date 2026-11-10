import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import type { Page } from '@application/contracts/Page';
import { questionParamsSchema } from '@application/controllers/question/schemas';
import { paginationSchema } from '@application/controllers/shared/schemas';
import type { AnswerSummary } from '@application/queries/question/AnswerSummary';
import { permissions } from '@application/security/permissions';
import type { ListAnswersUseCase } from '@application/usecases/question/ListAnswersUseCase';

export class ListAnswersController extends Controller<
  'private',
  Page<AnswerSummary>
> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly paramsSchema = questionParamsSchema;

  protected override readonly queryParamsSchema = paginationSchema;

  constructor(private readonly listAnswers: ListAnswersUseCase) {
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
    ListAnswersController.Params,
    ListAnswersController.QueryParams
  >): Promise<Controller.Response<Page<AnswerSummary>>> {
    const page = await this.listAnswers.execute({
      callerId: accountId,
      callerRole: role,
      ...params,
      ...queryParams,
    });

    return { statusCode: 200, body: page };
  }
}

export namespace ListAnswersController {
  export type Params = z.infer<typeof questionParamsSchema>;

  export type QueryParams = z.infer<typeof paginationSchema>;
}
