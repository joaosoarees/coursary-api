import type { StudentExportRepository } from '@application/repositories/export/StudentExportRepository';
import { DynamoStudentExportRepository } from '@infra/database/dynamo/repositories/export/DynamoStudentExportRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeStudentExportRepository(): StudentExportRepository {
  const appConfig = makeAppConfig();

  return new DynamoStudentExportRepository(appConfig);
}
