import { DeleteAttachmentController } from '@application/controllers/file/DeleteAttachmentController';
import { DeleteAttachmentUseCase } from '@application/usecases/file/DeleteAttachmentUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const useCase = new DeleteAttachmentUseCase(
  makeCourseRepository(),
  makeLessonRepository(),
  makeFileRepository(),
  makeFileStorage(),
);
const controller = new DeleteAttachmentController(useCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
