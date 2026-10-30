import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { courseIdParamsSchema } from '@application/controllers/shared/schemas';
import { permissions } from '@application/security/permissions';
import type { RequestStudentExportUseCase } from '@application/usecases/export/RequestStudentExportUseCase';
import type { StudentExportDetails } from '@application/usecases/export/StudentExportDetails';

export class RequestStudentExportController extends Controller<
  'private',
  StudentExportDetails
> {
  protected override readonly permission = permissions.CoursesListStudents;

  protected override readonly paramsSchema = courseIdParamsSchema;

  constructor(
    private readonly requestStudentExport: RequestStudentExportUseCase,
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
    RequestStudentExportController.Params
  >): Promise<Controller.Response<StudentExportDetails>> {
    const studentExport = await this.requestStudentExport.execute({
      callerId: accountId,
      callerRole: role,
      courseId: params.courseId,
    });

    return { statusCode: 202, body: studentExport };
  }
}

export namespace RequestStudentExportController {
  export type Params = z.infer<typeof courseIdParamsSchema>;
}
