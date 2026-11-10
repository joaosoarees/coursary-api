import { ListAnswersController } from '@application/controllers/question/ListAnswersController';
import { ListAnswersUseCase } from '@application/usecases/question/ListAnswersUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeListAnswersQuery } from '@main/factories/makeListAnswersQuery';
import { makeQuestionRepository } from '@main/factories/makeQuestionRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const listAnswersUseCase = new ListAnswersUseCase(
  makeCourseRepository(),
  makeEnrollmentRepository(),
  makeQuestionRepository(),
  makeListAnswersQuery(),
);
const controller = new ListAnswersController(listAnswersUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
