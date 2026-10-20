import { PublishCourseController } from '@application/controllers/course/PublishCourseController';
import { PublishCourseUseCase } from '@application/usecases/course/PublishCourseUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const publishCourseUseCase = new PublishCourseUseCase(coursesRepository);
const controller = new PublishCourseController(publishCourseUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
