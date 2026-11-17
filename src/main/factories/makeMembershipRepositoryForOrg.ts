import type { MembershipRepository } from '@application/repositories/organization/MembershipRepository';
import { DynamoMembershipRepository } from '@infra/database/dynamo/repositories/organization/DynamoMembershipRepository';
import { makeAppConfig } from '@main/factories/makeAppConfig';

export function makeMembershipRepositoryForOrg(): MembershipRepository.ForOrg {
  const appConfig = makeAppConfig();

  return (orgId) => new DynamoMembershipRepository(appConfig, orgId);
}
