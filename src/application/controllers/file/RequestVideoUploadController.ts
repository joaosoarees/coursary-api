import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { videoUploadSchema } from '@application/controllers/file/schemas';
import { permissions } from '@application/security/permissions';
import type { RequestVideoUploadUseCase } from '@application/usecases/file/RequestVideoUploadUseCase';

export class RequestVideoUploadController extends Controller<
  'private',
  RequestVideoUploadUseCase.Output
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly bodySchema = videoUploadSchema;

  constructor(private readonly requestVideoUpload: RequestVideoUploadUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    RequestVideoUploadController.Body,
    RequestVideoUploadController.Params
  >): Promise<Controller.Response<RequestVideoUploadUseCase.Output>> {
    const upload = await this.requestVideoUpload.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
      contentType: body.contentType,
      size: body.size,
    });

    return { statusCode: 201, body: upload };
  }
}

export namespace RequestVideoUploadController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type Body = z.infer<typeof videoUploadSchema>;
}
