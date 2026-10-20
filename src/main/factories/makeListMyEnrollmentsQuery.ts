import type { ListMyEnrollmentsQuery } from '@application/queries/enrollment/ListMyEnrollmentsQuery';
import { DynamoListMyEnrollmentsQuery } from '@infra/database/dynamo/queries/enrollment/DynamoListMyEnrollmentsQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';
import { makeCourseRepository } from '@main/factories/makeCourseRepository';

export function makeListMyEnrollmentsQuery(): ListMyEnrollmentsQuery {
  const appConfig = makeAppConfig();

  return new DynamoListMyEnrollmentsQuery(appConfig, makeCourseRepository());
}
