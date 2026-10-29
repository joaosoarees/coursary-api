import { CompleteVideoUploadController } from '@application/controllers/file/CompleteVideoUploadController';
import { CompleteVideoUploadUseCase } from '@application/usecases/file/CompleteVideoUploadUseCase';
import { VideoUploadLookup } from '@application/usecases/file/VideoUploadLookup';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeFileRepository } from '@main/factories/makeFileRepository';
import { makeFileStorage } from '@main/factories/makeFileStorage';
import { makeLessonRepository } from '@main/factories/makeLessonRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const lessonsRepository = makeLessonRepository();
const filesRepository = makeFileRepository();
const fileStorage = makeFileStorage();
const videoUploadLookup = new VideoUploadLookup(
  coursesRepository,
  lessonsRepository,
  filesRepository,
);
const completeVideoUploadUseCase = new CompleteVideoUploadUseCase(
  videoUploadLookup,
  fileStorage,
);
const controller = new CompleteVideoUploadController(
  completeVideoUploadUseCase,
);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
