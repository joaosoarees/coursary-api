import type { z } from 'zod';

import { Controller } from '@application/contracts/Controller';
import { exportIdParamsSchema } from '@application/controllers/export/schemas';
import { permissions } from '@application/security/permissions';
import type { GetStudentExportUseCase } from '@application/usecases/export/GetStudentExportUseCase';
import type { StudentExportDetails } from '@application/usecases/export/StudentExportDetails';

export class GetStudentExportController extends Controller<
  'private',
  StudentExportDetails
> {
  protected override readonly permission = permissions.CoursesListStudents;

  protected override readonly paramsSchema = exportIdParamsSchema;

  constructor(private readonly getStudentExport: GetStudentExportUseCase) {
    super();
  }

  protected async handle({
    accountId,
    role,
    params,
  }: Controller.Request<
    'private',
    Record<string, unknown>,
    GetStudentExportController.Params
  >): Promise<Controller.Response<StudentExportDetails>> {
    const studentExport = await this.getStudentExport.execute({
      callerId: accountId,
      callerRole: role,
      exportId: params.exportId,
    });

    return { statusCode: 200, body: studentExport };
  }
}

export namespace GetStudentExportController {
  export type Params = z.infer<typeof exportIdParamsSchema>;
}
