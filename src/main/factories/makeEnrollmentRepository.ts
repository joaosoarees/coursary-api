import type { EnrollmentRepository } from '@application/repositories/enrollment/EnrollmentRepository';
import { DynamoEnrollmentRepository } from '@infra/database/dynamo/repositories/enrollment/DynamoEnrollmentRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeEnrollmentRepository(): EnrollmentRepository {
  const appConfig = makeAppConfig();

  return new DynamoEnrollmentRepository(appConfig);
}
