import { CompleteLessonController } from '@application/controllers/enrollment/CompleteLessonController';
import { CompleteLessonUseCase } from '@application/usecases/enrollment/CompleteLessonUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeProgressRepository } from '@main/factories/makeProgressRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const lessonsRepository = makeLessonRepository();
const progressRepository = makeProgressRepository();
const completeLessonUseCase = new CompleteLessonUseCase(
  coursesRepository,
  enrollmentsRepository,
  lessonsRepository,
  progressRepository,
  makeUnitOfWork,
);
const controller = new CompleteLessonController(completeLessonUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
