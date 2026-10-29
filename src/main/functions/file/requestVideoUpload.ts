import { RequestVideoUploadController } from '@application/controllers/file/RequestVideoUploadController';
import { RequestVideoUploadUseCase } from '@application/usecases/file/RequestVideoUploadUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const lessonsRepository = makeLessonRepository();
const filesRepository = makeFileRepository();
const fileStorage = makeFileStorage();
const requestVideoUploadUseCase = new RequestVideoUploadUseCase(
  coursesRepository,
  lessonsRepository,
  filesRepository,
  fileStorage,
);
const controller = new RequestVideoUploadController(requestVideoUploadUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
