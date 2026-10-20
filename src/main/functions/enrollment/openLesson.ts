import { OpenLessonController } from '@application/controllers/enrollment/OpenLessonController';
import { OpenLessonUseCase } from '@application/usecases/enrollment/OpenLessonUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const lessonsRepository = makeLessonRepository();
const openLessonUseCase = new OpenLessonUseCase(
  coursesRepository,
  enrollmentsRepository,
  lessonsRepository,
);
const controller = new OpenLessonController(openLessonUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
