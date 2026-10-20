import type { CoursePageQuery } from '@application/queries/catalog/CoursePageQuery';
import { DynamoCoursePageQuery } from '@infra/database/dynamo/queries/catalog/DynamoCoursePageQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCoursePageQuery(): CoursePageQuery {
  const appConfig = makeAppConfig();

  return new DynamoCoursePageQuery(appConfig);
}
