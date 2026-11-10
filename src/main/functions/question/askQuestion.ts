import { AskQuestionController } from '@application/controllers/question/AskQuestionController';
import { AskQuestionUseCase } from '@application/usecases/question/AskQuestionUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeQuestionRepository } from '@main/factories/makeQuestionRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const askQuestionUseCase = new AskQuestionUseCase(
  makeCourseRepository(),
  makeEnrollmentRepository(),
  makeLessonRepository(),
  makeQuestionRepository(),
  makeUnitOfWork,
);
const controller = new AskQuestionController(askQuestionUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
