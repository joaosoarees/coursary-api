import { UpdateCourseController } from '@application/controllers/course/UpdateCourseController';
import { UpdateCourseUseCase } from '@application/usecases/course/UpdateCourseUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const updateCourseUseCase = new UpdateCourseUseCase(coursesRepository);
const controller = new UpdateCourseController(updateCourseUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
