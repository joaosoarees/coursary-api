import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { lessonParamsSchema } from '@application/controllers/enrollment/schemas';
import { videoPartUrlsSchema } from '@application/controllers/file/schemas';
import type { FileStorage } from '@application/gateways/file/FileStorage';
import { permissions } from '@application/security/permissions';
import type { SignVideoPartsUseCase } from '@application/usecases/file/SignVideoPartsUseCase';

export class SignVideoPartsController extends Controller<
  'private',
  FileStorage.SignedParts
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = lessonParamsSchema;

  protected override readonly bodySchema = videoPartUrlsSchema;

  constructor(private readonly signVideoParts: SignVideoPartsUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    SignVideoPartsController.Body,
    SignVideoPartsController.Params
  >): Promise<Controller.Response<FileStorage.SignedParts>> {
    const signed = await this.signVideoParts.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      lessonId: params.lessonId,
      fileId: body.fileId,
      partNumbers: body.partNumbers,
    });

    return { statusCode: 200, body: signed };
  }
}

export namespace SignVideoPartsController {
  export type Params = z.infer<typeof lessonParamsSchema>;

  export type Body = z.infer<typeof videoPartUrlsSchema>;
}
