import { ArchiveCourseController } from '@application/controllers/course/ArchiveCourseController';
import { ArchiveCourseUseCase } from '@application/usecases/course/ArchiveCourseUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makePublicAssetUrls } from '@main/factories/makePublicAssetUrls';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const publicAssetUrls = makePublicAssetUrls();
const archiveCourseUseCase = new ArchiveCourseUseCase(
  coursesRepository,
  publicAssetUrls,
);
const controller = new ArchiveCourseController(archiveCourseUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
