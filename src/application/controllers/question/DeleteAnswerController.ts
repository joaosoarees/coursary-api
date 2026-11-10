import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { answerParamsSchema } from '@application/controllers/question/schemas';
import { permissions } from '@application/security/permissions';
import type { DeleteAnswerUseCase } from '@application/usecases/question/DeleteAnswerUseCase';

export class DeleteAnswerController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesDiscuss;

  protected override readonly paramsSchema = answerParamsSchema;

  constructor(private readonly deleteAnswer: DeleteAnswerUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    DeleteAnswerController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.deleteAnswer.execute({
      callerId: accountId,
      callerRole: role,
      ...params,
    });

    return { statusCode: 204 };
  }
}

export namespace DeleteAnswerController {
  export type Params = z.infer<typeof answerParamsSchema>;
}
