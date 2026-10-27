import { z } from 'zod';

import { exportIdSchema } from '@application/controllers/export/schemas';
import { ProcessStudentExportUseCase } from '@application/usecases/export/ProcessStudentExportUseCase';
import { sqsBatchAdapter } from '@main/adapters/sqsBatchAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeListCourseStudentsQuery } from '@main/factories/makeListCourseStudentsQuery';
import { makeStudentExportRepository } from '@main/factories/makeStudentExportRepository';

const schema = z.object({ exportId: exportIdSchema });
const processStudentExportUseCase = new ProcessStudentExportUseCase(
  makeStudentExportRepository(),
  makeCourseRepository(),
  makeListCourseStudentsQuery(),
  makeFileStorage(),
);

export const handler = sqsBatchAdapter(schema, processStudentExportUseCase, {
  ordered: false,
});
