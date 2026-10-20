import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { EnrollmentDetails } from '@application/usecases/enrollment/EnrollmentDetails';
import type { EnrollUseCase } from '@application/usecases/enrollment/EnrollUseCase';

export class EnrollController extends Controller<'private', EnrollmentDetails> {
  protected override readonly permission = permissions.CoursesEnroll;

  protected override readonly paramsSchema = courseIdParamsSchema;

  constructor(private readonly enroll: EnrollUseCase) {
    super();
  }

  protected async handle({
    account,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    EnrollController.Params
  >): Promise<Controller.Response<EnrollmentDetails>> {
    const { enrollment, created } = await this.enroll.execute({
      student: account,
      courseId: params.courseId,
    });

    return { statusCode: created ? 201 : 200, body: enrollment };
  }
}

export namespace EnrollController {
  export type Params = z.infer<typeof courseIdParamsSchema>;
}
