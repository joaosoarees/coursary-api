import type { StudentExportQueue } from '@application/gateways/export/StudentExportQueue';
import { SqsStudentExportQueue } from '@infra/gateways/export/SqsStudentExportQueue';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeStudentExportQueue(): StudentExportQueue {
  const appConfig = makeAppConfig();

  return new SqsStudentExportQueue(appConfig);
}
