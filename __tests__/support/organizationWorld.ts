import { PutCommand } from '@aws-sdk/lib-dynamodb';

import { uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { MembershipItem } from '@infra/database/dynamo/items/organization/MembershipItem';
import { DynamoMembershipRepository } from '@infra/database/dynamo/repositories/organization/DynamoMembershipRepository';
import { DynamoOrganizationRepository } from '@infra/database/dynamo/repositories/organization/DynamoOrganizationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();

// An organization with its owner, and helpers to add members straight to the table.
export async function organizationWorld(name = 'Acme') {
  const organizations = new DynamoOrganizationRepository(config);
  const membershipsOf = (orgId: Organization.Id) =>
    new DynamoMembershipRepository(config, orgId);
  const unitOfWork = () => new DynamoUnitOfWork();

  const anAccount = (accountName: string) =>
    Account.create({ name: accountName, email: uniqueEmail(accountName) });

  const owner = anAccount('ana');
  const organization = Organization.create({ owner, name });
  await organizations.create(organization);

  const join = async (account: Account, role: Membership.Role) => {
    const membership = new Membership({
      orgId: organization.id,
      accountId: account.id,
      orgName: organization.name,
      role,
      joinedAt: new Date(),
    });
    await dynamoClient.send(
      new PutCommand({
        TableName: config.mainTableName,
        Item: MembershipItem.fromEntity(membership).toItem(),
      }),
    );

    return membership;
  };

  const roleOf = async (account: Account) =>
    (await membershipsOf(organization.id).find(account.id))?.role ?? null;

  return {
    organization,
    owner,
    ownership: Membership.ownerOf(organization),
    membershipsOf,
    unitOfWork,
    anAccount,
    join,
    roleOf,
  };
}
