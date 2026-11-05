import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { coverUploadParamsSchema } from '@application/controllers/course/schemas';
import { permissions } from '@application/security/permissions';
import type { GetCoverUploadUseCase } from '@application/usecases/file/GetCoverUploadUseCase';

export class GetCoverUploadController extends Controller<
  'private',
  GetCoverUploadUseCase.Output
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = coverUploadParamsSchema;

  constructor(private readonly getCoverUpload: GetCoverUploadUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    GetCoverUploadController.Params
  >): Promise<Controller.Response<GetCoverUploadUseCase.Output>> {
    const upload = await this.getCoverUpload.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      fileId: params.fileId,
    });

    return { statusCode: 200, body: upload };
  }
}

export namespace GetCoverUploadController {
  export type Params = z.infer<typeof coverUploadParamsSchema>;
}
