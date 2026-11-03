import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { avatarUploadParamsSchema } from '@application/controllers/account/schemas';
import type { GetAvatarUploadUseCase } from '@application/usecases/file/GetAvatarUploadUseCase';

export class GetAvatarUploadController extends Controller<
  'private',
  GetAvatarUploadUseCase.Output
> {
  protected override readonly paramsSchema = avatarUploadParamsSchema;

  constructor(private readonly getAvatarUpload: GetAvatarUploadUseCase) {
    super();
  }

  protected async handle({
    accountId,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    GetAvatarUploadController.Params
  >): Promise<Controller.Response<GetAvatarUploadUseCase.Output>> {
    const upload = await this.getAvatarUpload.execute({
      callerId: accountId,
      fileId: params.fileId,
    });

    return { statusCode: 200, body: upload };
  }
}

export namespace GetAvatarUploadController {
  export type Params = z.infer<typeof avatarUploadParamsSchema>;
}
