import { RequestCoverUploadController } from '@application/controllers/course/RequestCoverUploadController';
import { RequestCoverUploadUseCase } from '@application/usecases/file/RequestCoverUploadUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const filesRepository = makeFileRepository();
const fileStorage = makeFileStorage();
const requestCoverUploadUseCase = new RequestCoverUploadUseCase(
  coursesRepository,
  filesRepository,
  fileStorage,
);
const controller = new RequestCoverUploadController(requestCoverUploadUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
