import { CreateLessonController } from '@application/controllers/outline/CreateLessonController';
import { CreateLessonUseCase } from '@application/usecases/outline/CreateLessonUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseOutlineQuery } from '@main/factories/makeCourseOutlineQuery';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeModuleRepository } from '@main/factories/makeModuleRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const modulesRepository = makeModuleRepository();
const lessonsRepository = makeLessonRepository();
const courseOutlineQuery = makeCourseOutlineQuery();
const createLessonUseCase = new CreateLessonUseCase(
  coursesRepository,
  modulesRepository,
  lessonsRepository,
  courseOutlineQuery,
  makeUnitOfWork,
);
const controller = new CreateLessonController(createLessonUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
