import { SavePositionController } from '@application/controllers/enrollment/SavePositionController';
import { SavePositionUseCase } from '@application/usecases/enrollment/SavePositionUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeProgressRepository } from '@main/factories/makeProgressRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const progressRepository = makeProgressRepository();
const savePositionUseCase = new SavePositionUseCase(
  coursesRepository,
  enrollmentsRepository,
  progressRepository,
);
const controller = new SavePositionController(savePositionUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
