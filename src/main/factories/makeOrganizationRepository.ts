import type { OrganizationRepository } from '@application/repositories/organization/OrganizationRepository';
import { DynamoOrganizationRepository } from '@infra/database/dynamo/repositories/organization/DynamoOrganizationRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeOrganizationRepository(): OrganizationRepository {
  const appConfig = makeAppConfig();

  return new DynamoOrganizationRepository(appConfig);
}
