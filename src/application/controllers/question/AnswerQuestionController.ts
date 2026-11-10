import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import {
  postSchema,
  questionParamsSchema,
} from '@application/controllers/question/schemas';
import type { AnswerSummary } from '@application/queries/question/AnswerSummary';
import { permissions } from '@application/security/permissions';
import type { AnswerQuestionUseCase } from '@application/usecases/question/AnswerQuestionUseCase';

export class AnswerQuestionController extends Controller<
  'private',
  AnswerSummary
> {
  protected override readonly permission = permissions.CoursesDiscuss;

  protected override readonly paramsSchema = questionParamsSchema;

  protected override readonly bodySchema = postSchema;

  constructor(private readonly answerQuestion: AnswerQuestionUseCase) {
    super();
  }

  protected async handle({
    account,
    params,
    body,
  }: Controller.Request<
    'private',
    AnswerQuestionController.Body,
    AnswerQuestionController.Params
  >): Promise<Controller.Response<AnswerSummary>> {
    const answer = await this.answerQuestion.execute({
      author: account,
      ...params,
      text: body.text,
    });

    return { statusCode: 201, body: answer };
  }
}

export namespace AnswerQuestionController {
  export type Body = z.infer<typeof postSchema>;

  export type Params = z.infer<typeof questionParamsSchema>;
}
