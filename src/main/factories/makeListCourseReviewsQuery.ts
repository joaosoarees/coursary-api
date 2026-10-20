import type { ListCourseReviewsQuery } from '@application/queries/review/ListCourseReviewsQuery';
import { DynamoListCourseReviewsQuery } from '@infra/database/dynamo/queries/review/DynamoListCourseReviewsQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListCourseReviewsQuery(): ListCourseReviewsQuery {
  const appConfig = makeAppConfig();

  return new DynamoListCourseReviewsQuery(appConfig);
}
