import type { ListRoleChangesQuery } from '@application/queries/admin/ListRoleChangesQuery';
import { DynamoListRoleChangesQuery } from '@infra/database/dynamo/queries/admin/DynamoListRoleChangesQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListRoleChangesQuery(): ListRoleChangesQuery {
  const appConfig = makeAppConfig();

  return new DynamoListRoleChangesQuery(appConfig);
}
