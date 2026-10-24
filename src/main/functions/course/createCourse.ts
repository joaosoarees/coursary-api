import { CreateCourseController } from '@application/controllers/course/CreateCourseController';
import { CreateCourseUseCase } from '@application/usecases/course/CreateCourseUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makePublicAssetUrls } from '@main/factories/makePublicAssetUrls';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const publicAssetUrls = makePublicAssetUrls();
const createCourseUseCase = new CreateCourseUseCase(
  coursesRepository,
  publicAssetUrls,
);
const controller = new CreateCourseController(createCourseUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
