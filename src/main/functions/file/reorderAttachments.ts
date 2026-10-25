import { ReorderAttachmentsController } from '@application/controllers/file/ReorderAttachmentsController';
import { ReorderAttachmentsUseCase } from '@application/usecases/file/ReorderAttachmentsUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const useCase = new ReorderAttachmentsUseCase(
  makeCourseRepository(),
  makeLessonRepository(),
  makeFileRepository(),
  makeUnitOfWork,
);
const controller = new ReorderAttachmentsController(useCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
