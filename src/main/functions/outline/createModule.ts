import { CreateModuleController } from '@application/controllers/outline/CreateModuleController';
import { CreateModuleUseCase } from '@application/usecases/outline/CreateModuleUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseOutlineQuery } from '@main/factories/makeCourseOutlineQuery';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeModuleRepository } from '@main/factories/makeModuleRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const modulesRepository = makeModuleRepository();
const courseOutlineQuery = makeCourseOutlineQuery();
const createModuleUseCase = new CreateModuleUseCase(
  coursesRepository,
  modulesRepository,
  courseOutlineQuery,
  makeUnitOfWork,
);
const controller = new CreateModuleController(createModuleUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
