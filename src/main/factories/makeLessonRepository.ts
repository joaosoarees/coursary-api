import type { LessonRepository } from '@application/repositories/outline/LessonRepository';
import { DynamoLessonRepository } from '@infra/database/dynamo/repositories/outline/DynamoLessonRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeLessonRepository(): LessonRepository {
  const appConfig = makeAppConfig();

  return new DynamoLessonRepository(appConfig);
}
