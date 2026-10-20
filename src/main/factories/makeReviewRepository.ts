import type { ReviewRepository } from '@application/repositories/review/ReviewRepository';
import { DynamoReviewRepository } from '@infra/database/dynamo/repositories/review/DynamoReviewRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeReviewRepository(): ReviewRepository {
  const appConfig = makeAppConfig();

  return new DynamoReviewRepository(appConfig);
}
