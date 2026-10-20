import { GetProgressController } from '@application/controllers/enrollment/GetProgressController';
import { GetProgressUseCase } from '@application/usecases/enrollment/GetProgressUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseProgressQuery } from '@main/factories/makeCourseProgressQuery';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const courseProgressQuery = makeCourseProgressQuery();
const getProgressUseCase = new GetProgressUseCase(
  coursesRepository,
  enrollmentsRepository,
  courseProgressQuery,
);
const controller = new GetProgressController(getProgressUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
