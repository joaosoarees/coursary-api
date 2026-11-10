import { DeleteAnswerController } from '@application/controllers/question/DeleteAnswerController';
import { DeleteAnswerUseCase } from '@application/usecases/question/DeleteAnswerUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeQuestionRepository } from '@main/factories/makeQuestionRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const deleteAnswerUseCase = new DeleteAnswerUseCase(
  makeCourseRepository(),
  makeEnrollmentRepository(),
  makeQuestionRepository(),
  makeUnitOfWork,
);
const controller = new DeleteAnswerController(deleteAnswerUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
