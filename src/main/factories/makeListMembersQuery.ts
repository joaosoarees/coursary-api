import type { ListMembersQuery } from '@application/queries/organization/ListMembersQuery';
import { DynamoListMembersQuery } from '@infra/database/dynamo/queries/organization/DynamoListMembersQuery';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeListMembersQuery(): ListMembersQuery {
  const appConfig = makeAppConfig();

  return new DynamoListMembersQuery(appConfig);
}
