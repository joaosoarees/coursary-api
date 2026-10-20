import type { CourseRepository } from '@application/repositories/course/CourseRepository';
import { DynamoCourseRepository } from '@infra/database/dynamo/repositories/course/DynamoCourseRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCourseRepository(): CourseRepository {
  const appConfig = makeAppConfig();

  return new DynamoCourseRepository(appConfig);
}
