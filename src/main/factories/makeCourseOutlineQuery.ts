import type { CourseOutlineQuery } from '@application/queries/outline/CourseOutlineQuery';
import { DynamoCourseOutlineQuery } from '@infra/database/dynamo/queries/outline/DynamoCourseOutlineQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCourseOutlineQuery(): CourseOutlineQuery {
  const appConfig = makeAppConfig();

  return new DynamoCourseOutlineQuery(appConfig);
}
