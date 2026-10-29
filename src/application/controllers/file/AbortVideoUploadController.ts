import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { videoUploadIdSchema } from '@application/controllers/file/schemas';
import { permissions } from '@application/security/permissions';
import type { AbortVideoUploadUseCase } from '@application/usecases/file/AbortVideoUploadUseCase';

export class AbortVideoUploadController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly bodySchema = videoUploadIdSchema;

  constructor(private readonly abortVideoUpload: AbortVideoUploadUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    AbortVideoUploadController.Body,
    AbortVideoUploadController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.abortVideoUpload.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
      fileId: body.fileId,
    });

    return { statusCode: 204 };
  }
}

export namespace AbortVideoUploadController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type Body = z.infer<typeof videoUploadIdSchema>;
}
