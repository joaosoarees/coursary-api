import { UpdateMeController } from '@application/controllers/account/UpdateMeController';
import { UpdateMeUseCase } from '@application/usecases/account/UpdateMeUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeAccountRepository } from '@main/factories/makeAccountRepository';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makePublicAssetUrls } from '@main/factories/makePublicAssetUrls';
import { makeQuestionRepository } from '@main/factories/makeQuestionRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeReviewRepository } from '@main/factories/makeReviewRepository';

const accountsRepository = makeAccountRepository();
const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const reviewsRepository = makeReviewRepository();
const questionsRepository = makeQuestionRepository();
const publicAssetUrls = makePublicAssetUrls();
const updateMeUseCase = new UpdateMeUseCase(
  accountsRepository,
  coursesRepository,
  enrollmentsRepository,
  reviewsRepository,
  questionsRepository,
  publicAssetUrls,
);
const controller = new UpdateMeController(updateMeUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
