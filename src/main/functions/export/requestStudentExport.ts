import { RequestStudentExportController } from '@application/controllers/export/RequestStudentExportController';
import { RequestStudentExportUseCase } from '@application/usecases/export/RequestStudentExportUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeStudentExportRepository } from '@main/factories/makeStudentExportRepository';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const requestStudentExportUseCase = new RequestStudentExportUseCase(
  makeCourseRepository(),
  makeStudentExportRepository(),
  makeUnitOfWork,
);
const controller = new RequestStudentExportController(
  requestStudentExportUseCase,
);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
