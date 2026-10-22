import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { avatarUploadSchema } from '@application/controllers/account/schemas';
import type { RequestAvatarUploadUseCase } from '@application/usecases/file/RequestAvatarUploadUseCase';

export class RequestAvatarUploadController extends Controller<
  'private',
  RequestAvatarUploadUseCase.Output
> {
  protected override readonly bodySchema = avatarUploadSchema;

  constructor(
    private readonly requestAvatarUpload: RequestAvatarUploadUseCase,
  ) {
    super();
  }

  protected async handle({
    account,
    body,
  }: Controller.Request<
    'private',
    RequestAvatarUploadController.Body
  >): Promise<Controller.Response<RequestAvatarUploadUseCase.Output>> {
    const upload = await this.requestAvatarUpload.execute({
      account,
      contentType: body.contentType,
    });

    return { statusCode: 201, body: upload };
  }
}

export namespace RequestAvatarUploadController {
  export type Body = z.infer<typeof avatarUploadSchema>;
}
