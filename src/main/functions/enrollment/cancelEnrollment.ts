import { CancelEnrollmentController } from '@application/controllers/enrollment/CancelEnrollmentController';
import { CancelEnrollmentUseCase } from '@application/usecases/enrollment/CancelEnrollmentUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const cancelEnrollmentUseCase = new CancelEnrollmentUseCase(
  coursesRepository,
  enrollmentsRepository,
  makeUnitOfWork,
);
const controller = new CancelEnrollmentController(cancelEnrollmentUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
