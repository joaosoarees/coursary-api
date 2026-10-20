import { ReviewCourseController } from '@application/controllers/review/ReviewCourseController';
import { ReviewCourseUseCase } from '@application/usecases/review/ReviewCourseUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeEnrollmentRepository } from '@main/factories/makeEnrollmentRepository';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeReviewRepository } from '@main/factories/makeReviewRepository';
import { makeUnitOfWork } from '@main/factories/makeUnitOfWork';

const coursesRepository = makeCourseRepository();
const enrollmentsRepository = makeEnrollmentRepository();
const reviewsRepository = makeReviewRepository();
const reviewCourseUseCase = new ReviewCourseUseCase(
  coursesRepository,
  enrollmentsRepository,
  reviewsRepository,
  makeUnitOfWork,
);
const controller = new ReviewCourseController(reviewCourseUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
