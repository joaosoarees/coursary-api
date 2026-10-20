import { ListMyCoursesController } from '@application/controllers/course/ListMyCoursesController';
import { ListMyCoursesUseCase } from '@application/usecases/course/ListMyCoursesUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeListCoursesByInstructorQuery } from '@main/factories/makeListCoursesByInstructorQuery';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const listCoursesByInstructorQuery = makeListCoursesByInstructorQuery();
const listMyCoursesUseCase = new ListMyCoursesUseCase(
  listCoursesByInstructorQuery,
);
const controller = new ListMyCoursesController(listMyCoursesUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
