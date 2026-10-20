import { ListCourseStudentsController } from '@application/controllers/enrollment/ListCourseStudentsController';
import { ListCourseStudentsUseCase } from '@application/usecases/enrollment/ListCourseStudentsUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeListCourseStudentsQuery } from '@main/factories/makeListCourseStudentsQuery';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const listCourseStudentsQuery = makeListCourseStudentsQuery();
const listCourseStudentsUseCase = new ListCourseStudentsUseCase(
  coursesRepository,
  listCourseStudentsQuery,
);
const controller = new ListCourseStudentsController(listCourseStudentsUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
