import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { attachmentParamsSchema } from '@application/controllers/file/schemas';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import { permissions } from '@application/security/permissions';
import type { GetAttachmentDownloadUseCase } from '@application/usecases/file/GetAttachmentDownloadUseCase';

export class GetAttachmentDownloadController extends Controller<
  'private',
  FileStorage.SignedDownload
> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly paramsSchema = attachmentParamsSchema;

  constructor(
    private readonly getAttachmentDownload: GetAttachmentDownloadUseCase,
  ) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    GetAttachmentDownloadController.Params
  >): Promise<Controller.Response<FileStorage.SignedDownload>> {
    const download = await this.getAttachmentDownload.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
      fileId: params.fileId,
    });

    return { statusCode: 200, body: download };
  }
}

export namespace GetAttachmentDownloadController {
  export type Params = z.infer<typeof attachmentParamsSchema>;
}
