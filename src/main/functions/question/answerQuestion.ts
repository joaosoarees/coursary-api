import { AnswerQuestionController } from '@application/controllers/question/AnswerQuestionController';
import { AnswerQuestionUseCase } from '@application/usecases/question/AnswerQuestionUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeQuestionRepository } from '@main/factories/makeQuestionRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const questionsRepository = makeQuestionRepository();
const answerQuestionUseCase = new AnswerQuestionUseCase(
  coursesRepository,
  enrollmentsRepository,
  questionsRepository,
  makeUnitOfWork,
);
const controller = new AnswerQuestionController(answerQuestionUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
