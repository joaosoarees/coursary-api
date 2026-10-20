import { DeleteLessonController } from '@application/controllers/outline/DeleteLessonController';
import { DeleteLessonUseCase } from '@application/usecases/outline/DeleteLessonUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeModuleRepository } from '@main/factories/makeModuleRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const modulesRepository = makeModuleRepository();
const lessonsRepository = makeLessonRepository();
const deleteLessonUseCase = new DeleteLessonUseCase(
  coursesRepository,
  modulesRepository,
  lessonsRepository,
  makeUnitOfWork,
);
const controller = new DeleteLessonController(deleteLessonUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
