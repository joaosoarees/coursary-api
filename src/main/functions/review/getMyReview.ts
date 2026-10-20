import { GetMyReviewController } from '@application/controllers/review/GetMyReviewController';
import { GetMyReviewUseCase } from '@application/usecases/review/GetMyReviewUseCase';
import { lambdaHttpAdapter } from '@main/adapters/lambdaHttpAdapter';
import { makeResolveCallerUseCase } from '@main/factories/makeResolveCallerUseCase';
import { makeReviewRepository } from '@main/factories/makeReviewRepository';

const reviewsRepository = makeReviewRepository();
const getMyReviewUseCase = new GetMyReviewUseCase(reviewsRepository);
const controller = new GetMyReviewController(getMyReviewUseCase);
const resolveCaller = makeResolveCallerUseCase();

export const handler = lambdaHttpAdapter(controller, resolveCaller);
