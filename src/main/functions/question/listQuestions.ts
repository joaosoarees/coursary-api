import { ListQuestionsController } from '@application/controllers/question/ListQuestionsController';
import { ListQuestionsUseCase } from '@application/usecases/question/ListQuestionsUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeListQuestionsQuery } from '@main/factories/makeListQuestionsQuery';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const lessonsRepository = makeLessonRepository();
const listQuestionsQuery = makeListQuestionsQuery();
const listQuestionsUseCase = new ListQuestionsUseCase(
  coursesRepository,
  enrollmentsRepository,
  lessonsRepository,
  listQuestionsQuery,
);
const controller = new ListQuestionsController(listQuestionsUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
