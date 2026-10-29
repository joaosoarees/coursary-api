import { DeleteVideoController } from '@application/controllers/file/DeleteVideoController';
import { DeleteVideoUseCase } from '@application/usecases/file/DeleteVideoUseCase';
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
const deleteVideoUseCase = new DeleteVideoUseCase(
  coursesRepository,
  lessonsRepository,
  filesRepository,
  fileStorage,
);
const controller = new DeleteVideoController(deleteVideoUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
