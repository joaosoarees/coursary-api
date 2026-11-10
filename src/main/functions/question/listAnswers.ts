import { ListAnswersController } from '@application/controllers/question/ListAnswersController';
import { ListAnswersUseCase } from '@application/usecases/question/ListAnswersUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeListAnswersQuery } from '@main/factories/makeListAnswersQuery';
import { makeQuestionRepository } from '@main/factories/makeQuestionRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const questionsRepository = makeQuestionRepository();
const listAnswersQuery = makeListAnswersQuery();
const listAnswersUseCase = new ListAnswersUseCase(
  coursesRepository,
  enrollmentsRepository,
  questionsRepository,
  listAnswersQuery,
);
const controller = new ListAnswersController(listAnswersUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
