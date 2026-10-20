import { DeleteCourseController } from '@application/controllers/course/DeleteCourseController';
import { DeleteCourseUseCase } from '@application/usecases/course/DeleteCourseUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const deleteCourseUseCase = new DeleteCourseUseCase(coursesRepository);
const controller = new DeleteCourseController(deleteCourseUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
