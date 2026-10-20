import type { CourseDeletionRepository } from '@application/repositories/course/CourseDeletionRepository';
import { DynamoCourseDeletion } from '@infra/database/dynamo/repositories/course/DynamoCourseDeletion';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeCourseDeletionRepository(): CourseDeletionRepository {
  const appConfig = makeAppConfig();

  return new DynamoCourseDeletion(appConfig);
}
