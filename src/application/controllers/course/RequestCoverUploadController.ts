import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { coverUploadSchema } from '@application/controllers/course/schemas';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { RequestCoverUploadUseCase } from '@application/usecases/file/RequestCoverUploadUseCase';

export class RequestCoverUploadController extends Controller<
  'private',
  RequestCoverUploadUseCase.Output
> {
  protected override readonly permission = permissions.CoursesUpdate;

  protected override readonly paramsSchema = courseIdParamsSchema;

  protected override readonly bodySchema = coverUploadSchema;

  constructor(private readonly requestCoverUpload: RequestCoverUploadUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
    body,
  }: Controller.Request<
    'private',
    RequestCoverUploadController.Body,
    RequestCoverUploadController.Params
  >): Promise<Controller.Response<RequestCoverUploadUseCase.Output>> {
    const upload = await this.requestCoverUpload.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
      contentType: body.contentType,
    });

    return { statusCode: 201, body: upload };
  }
}

export namespace RequestCoverUploadController {
  export type Params = z.infer<typeof courseIdParamsSchema>;

  export type Body = z.infer<typeof coverUploadSchema>;
}
