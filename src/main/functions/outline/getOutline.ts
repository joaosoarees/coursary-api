import { GetCourseOutlineController } from '@application/controllers/outline/GetCourseOutlineController';
import { GetCourseOutlineUseCase } from '@application/usecases/outline/GetCourseOutlineUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseOutlineQuery } from '@main/factories/makeCourseOutlineQuery';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const courseOutlineQuery = makeCourseOutlineQuery();
const getCourseOutlineUseCase = new GetCourseOutlineUseCase(
  coursesRepository,
  enrollmentsRepository,
  courseOutlineQuery,
);
const controller = new GetCourseOutlineController(getCourseOutlineUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
