import { DeleteQuestionController } from '@application/controllers/question/DeleteQuestionController';
import { DeleteQuestionUseCase } from '@application/usecases/question/DeleteQuestionUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeQuestionRepository } from '@main/factories/makeQuestionRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const deleteQuestionUseCase = new DeleteQuestionUseCase(
  makeCourseRepository(),
  makeEnrollmentRepository(),
  makeQuestionRepository(),
);
const controller = new DeleteQuestionController(deleteQuestionUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
