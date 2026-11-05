import { GetManagedCourseController } from '@application/controllers/course/GetManagedCourseController';
import { GetManagedCourseUseCase } from '@application/usecases/course/GetManagedCourseUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makePublicAssetUrls } from '@main/factories/makePublicAssetUrls';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const getManagedCourseUseCase = new GetManagedCourseUseCase(
  makeCourseRepository(),
  makePublicAssetUrls(),
);
const controller = new GetManagedCourseController(getManagedCourseUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
