import { EnrollController } from '@application/controllers/enrollment/EnrollController';
import { EnrollUseCase } from '@application/usecases/enrollment/EnrollUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const enrollUseCase = new EnrollUseCase(
  coursesRepository,
  enrollmentsRepository,
  makeUnitOfWork,
);
const controller = new EnrollController(enrollUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
