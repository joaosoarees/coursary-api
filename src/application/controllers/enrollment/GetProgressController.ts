import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { GetProgressUseCase } from '@application/usecases/enrollment/GetProgressUseCase';
import type { ProgressDetails } from '@application/usecases/enrollment/ProgressDetails';

export class GetProgressController extends Controller<
  'private',
  ProgressDetails
> {
  protected override readonly permission = permissions.CoursesLearn;

  protected override readonly paramsSchema = courseIdParamsSchema;

  constructor(private readonly getProgress: GetProgressUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    GetProgressController.Params
  >): Promise<Controller.Response<ProgressDetails>> {
    const progress = await this.getProgress.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
    });

    return { statusCode: 200, body: progress };
  }
}

export namespace GetProgressController {
  export type Params = z.infer<typeof courseIdParamsSchema>;
}
