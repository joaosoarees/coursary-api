import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { attachmentUploadSchema } from '@application/controllers/file/schemas';
import { permissions } from '@application/security/permissions';
import type { RequestAttachmentUploadUseCase } from '@application/usecases/file/RequestAttachmentUploadUseCase';

export class RequestAttachmentUploadController extends Controller<
  'private',
  RequestAttachmentUploadUseCase.Output
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly bodySchema = attachmentUploadSchema;

  constructor(
    private readonly requestAttachmentUpload: RequestAttachmentUploadUseCase,
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
    RequestAttachmentUploadController.Body,
    RequestAttachmentUploadController.Params
  >): Promise<Controller.Response<RequestAttachmentUploadUseCase.Output>> {
    const upload = await this.requestAttachmentUpload.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
      contentType: body.contentType,
      fileName: body.fileName,
    });

    return { statusCode: 201, body: upload };
  }
}

export namespace RequestAttachmentUploadController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type Body = z.infer<typeof attachmentUploadSchema>;
}
