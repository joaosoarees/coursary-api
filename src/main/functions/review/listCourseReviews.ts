import { ListCourseReviewsController } from '@application/controllers/review/ListCourseReviewsController';
import { ListCourseReviewsUseCase } from '@application/usecases/review/ListCourseReviewsUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';
import { makeListCourseReviewsQuery } from '@main/factories/makeListCourseReviewsQuery';

const coursesRepository = makeCourseRepository();
const listCourseReviewsQuery = makeListCourseReviewsQuery();
const listCourseReviewsUseCase = new ListCourseReviewsUseCase(
  coursesRepository,
  listCourseReviewsQuery,
);
const controller = new ListCourseReviewsController(listCourseReviewsUseCase);

export const handler = lambdaHttpAdapter(controller);
