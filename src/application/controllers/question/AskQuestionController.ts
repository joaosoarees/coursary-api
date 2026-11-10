import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { postSchema } from '@application/controllers/question/schemas';
import type { QuestionSummary } from '@application/queries/question/QuestionSummary';
import { permissions } from '@application/security/permissions';
import type { AskQuestionUseCase } from '@application/usecases/question/AskQuestionUseCase';

export class AskQuestionController extends Controller<
  'private',
  QuestionSummary
> {
  protected override readonly permission = permissions.CoursesDiscuss;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly bodySchema = postSchema;

  constructor(private readonly askQuestion: AskQuestionUseCase) {
    super();
  }

  protected async handle({
    account,
    params,
    body,
  }: Controller.Request<
    'private',
    AskQuestionController.Body,
    AskQuestionController.Params
  >): Promise<Controller.Response<QuestionSummary>> {
    const question = await this.askQuestion.execute({
      author: account,
      courseId: params.courseId,
      lessonId: params.lessonId,
      text: body.text,
    });

    return { statusCode: 201, body: question };
  }
}

export namespace AskQuestionController {
  export type Body = z.infer<typeof postSchema>;

  export type Params = z.infer<typeof lessonParamsSchema>;
}
