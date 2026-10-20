import type { ListAccountsByRoleQuery } from '@application/queries/admin/ListAccountsByRoleQuery';
import { DynamoListAccountsByRoleQuery } from '@infra/database/dynamo/queries/admin/DynamoListAccountsByRoleQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListAccountsByRoleQuery(): ListAccountsByRoleQuery {
  const appConfig = makeAppConfig();

  return new DynamoListAccountsByRoleQuery(appConfig);
}
