import { RequestAttachmentUploadController } from '@application/controllers/file/RequestAttachmentUploadController';
import { RequestAttachmentUploadUseCase } from '@application/usecases/file/RequestAttachmentUploadUseCase';
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
const requestAttachmentUploadUseCase = new RequestAttachmentUploadUseCase(
  coursesRepository,
  lessonsRepository,
  filesRepository,
  fileStorage,
);
const controller = new RequestAttachmentUploadController(
  requestAttachmentUploadUseCase,
);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
