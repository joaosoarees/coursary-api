import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { videoCompletionSchema } from '@application/controllers/file/schemas';
import { permissions } from '@application/security/permissions';
import type { CompleteVideoUploadUseCase } from '@application/usecases/file/CompleteVideoUploadUseCase';

export class CompleteVideoUploadController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly bodySchema = videoCompletionSchema;

  constructor(
    private readonly completeVideoUpload: CompleteVideoUploadUseCase,
  ) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    CompleteVideoUploadController.Body,
    CompleteVideoUploadController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.completeVideoUpload.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
      fileId: body.fileId,
      parts: body.parts,
    });

    return { statusCode: 201 };
  }
}

export namespace CompleteVideoUploadController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type Body = z.infer<typeof videoCompletionSchema>;
}
