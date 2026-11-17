import type { ListMyOrganizationsQuery } from '@application/queries/organization/ListMyOrganizationsQuery';
import { DynamoListMyOrganizationsQuery } from '@infra/database/dynamo/queries/organization/DynamoListMyOrganizationsQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListMyOrganizationsQuery(): ListMyOrganizationsQuery {
  const appConfig = makeAppConfig();

  return new DynamoListMyOrganizationsQuery(appConfig);
}
