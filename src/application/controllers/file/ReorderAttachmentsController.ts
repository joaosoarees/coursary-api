import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { reorderAttachmentsSchema } from '@application/controllers/file/schemas';
import { permissions } from '@application/security/permissions';
import type { AttachmentSummary } from '@application/usecases/file/AttachmentSummary';
import type { ReorderAttachmentsUseCase } from '@application/usecases/file/ReorderAttachmentsUseCase';

export class ReorderAttachmentsController extends Controller<
  'private',
  ReorderAttachmentsController.Response
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly bodySchema = reorderAttachmentsSchema;

  constructor(private readonly reorderAttachments: ReorderAttachmentsUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    ReorderAttachmentsController.Body,
    ReorderAttachmentsController.Params
  >): Promise<Controller.Response<ReorderAttachmentsController.Response>> {
    const items = await this.reorderAttachments.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
      fileIds: body.fileIds,
    });

    return { statusCode: 200, body: { items } };
  }
}

export namespace ReorderAttachmentsController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type Body = z.infer<typeof reorderAttachmentsSchema>;

  export interface Response {
    items: AttachmentSummary[];
  }
}
