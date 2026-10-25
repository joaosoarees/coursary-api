import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { attachmentParamsSchema } from '@application/controllers/file/schemas';
import { permissions } from '@application/security/permissions';
import type { DeleteAttachmentUseCase } from '@application/usecases/file/DeleteAttachmentUseCase';

export class DeleteAttachmentController extends Controller<'private'> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = attachmentParamsSchema;

  constructor(private readonly deleteAttachment: DeleteAttachmentUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    DeleteAttachmentController.Params
  >): Promise<Controller.Response<undefined>> {
    await this.deleteAttachment.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
      fileId: params.fileId,
    });

    return { statusCode: 204 };
  }
}

export namespace DeleteAttachmentController {
  export type Params = z.infer<typeof attachmentParamsSchema>;
}
