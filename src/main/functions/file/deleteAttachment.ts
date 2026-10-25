import { DeleteAttachmentController } from '@application/controllers/file/DeleteAttachmentController';
import { DeleteAttachmentUseCase } from '@application/usecases/file/DeleteAttachmentUseCase';
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
const deleteAttachmentUseCase = new DeleteAttachmentUseCase(
  coursesRepository,
  lessonsRepository,
  filesRepository,
  fileStorage,
);
const controller = new DeleteAttachmentController(deleteAttachmentUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
