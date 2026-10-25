import { GetAttachmentDownloadController } from '@application/controllers/file/GetAttachmentDownloadController';
import { GetAttachmentDownloadUseCase } from '@application/usecases/file/GetAttachmentDownloadUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const useCase = new GetAttachmentDownloadUseCase(
  makeCourseRepository(),
  makeEnrollmentRepository(),
  makeLessonRepository(),
  makeFileRepository(),
  makeFileStorage(),
);
const controller = new GetAttachmentDownloadController(useCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
