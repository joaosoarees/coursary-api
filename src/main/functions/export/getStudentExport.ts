import { GetStudentExportController } from '@application/controllers/export/GetStudentExportController';
import { GetStudentExportUseCase } from '@application/usecases/export/GetStudentExportUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeStudentExportRepository } from '@main/factories/makeStudentExportRepository';

const getStudentExportUseCase = new GetStudentExportUseCase(
  makeStudentExportRepository(),
  makeCourseRepository(),
  makeFileStorage(),
);
const controller = new GetStudentExportController(getStudentExportUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
