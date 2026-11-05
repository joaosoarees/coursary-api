import { GetCoverUploadController } from '@application/controllers/course/GetCoverUploadController';
import { GetCoverUploadUseCase } from '@application/usecases/file/GetCoverUploadUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const getCoverUploadUseCase = new GetCoverUploadUseCase(
  makeCourseRepository(),
  makeFileRepository(),
);
const controller = new GetCoverUploadController(getCoverUploadUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
