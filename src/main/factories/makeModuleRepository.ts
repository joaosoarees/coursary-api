import type { ModuleRepository } from '@application/repositories/outline/ModuleRepository';
import { DynamoModuleRepository } from '@infra/database/dynamo/repositories/outline/DynamoModuleRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeModuleRepository(): ModuleRepository {
  const appConfig = makeAppConfig();

  return new DynamoModuleRepository(appConfig);
}
