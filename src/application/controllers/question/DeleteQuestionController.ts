import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { questionParamsSchema } from '@application/controllers/question/schemas';
import { permissions } from '@application/security/permissions';
import type { DeleteQuestionUseCase } from '@application/usecases/question/DeleteQuestionUseCase';

export class DeleteQuestionController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesDiscuss;

  protected override readonly paramsSchema = questionParamsSchema;

  constructor(private readonly deleteQuestion: DeleteQuestionUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    DeleteQuestionController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.deleteQuestion.execute({
      callerId: accountId,
      callerRole: role,
      ...params,
    });

    return { statusCode: 204 };
  }
}

export namespace DeleteQuestionController {
  export type Params = z.infer<typeof questionParamsSchema>;
}
