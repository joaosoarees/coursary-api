import type { CourseProgressQuery } from '@application/queries/enrollment/CourseProgressQuery';
import { DynamoCourseProgressQuery } from '@infra/database/dynamo/queries/enrollment/DynamoCourseProgressQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCourseProgressQuery(): CourseProgressQuery {
  const appConfig = makeAppConfig();

  return new DynamoCourseProgressQuery(appConfig);
}
