import type { ProgressRepository } from '@application/repositories/enrollment/ProgressRepository';
import { DynamoProgressRepository } from '@infra/database/dynamo/repositories/enrollment/DynamoProgressRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeProgressRepository(): ProgressRepository {
  const appConfig = makeAppConfig();

  return new DynamoProgressRepository(appConfig);
}
