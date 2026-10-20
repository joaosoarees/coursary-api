import { UpdateLessonController } from '@application/controllers/outline/UpdateLessonController';
import { UpdateLessonUseCase } from '@application/usecases/outline/UpdateLessonUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const lessonsRepository = makeLessonRepository();
const updateLessonUseCase = new UpdateLessonUseCase(
  coursesRepository,
  lessonsRepository,
  makeUnitOfWork,
);
const controller = new UpdateLessonController(updateLessonUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
