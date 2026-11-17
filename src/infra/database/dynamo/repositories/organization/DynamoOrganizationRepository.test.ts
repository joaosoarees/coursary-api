import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { Organization } from '@application/entities/organization/Organization';
import { Conflict } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoOrganizationRepository } from '@infra/database/dynamo/repositories/organization/DynamoOrganizationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const organizations = new DynamoOrganizationRepository(config);

const membershipOf = async (organization: Organization, account: Account) => {
  const { Item } = await dynamoClient.send(
    new GetCommand({
      TableName: config.mainTableName,
      Key: { PK: `ORG#${organization.id}`, SK: `MEMBER#${account.id}` },
      ConsistentRead: true,
    }),
  );

  return Item;
};

const owner = Account.create({ name: 'Ana', email: uniqueEmail('ana') });

describe('DynamoOrganizationRepository', () => {
  it('should store the organization with its owner', async () => {
    const organization = Organization.create({ owner, name: 'Acme' });

    await organizations.create(organization);

    await expect(membershipOf(organization, owner)).resolves.toMatchObject({
      role: 'OWNER',
      orgName: 'Acme',
    });
  });

  it('should refuse an id that is taken, writing nothing', async () => {
    const organization = Organization.create({ owner, name: 'Acme' });
    await organizations.create(organization);
    const other = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
    const clash = new Organization({
      id: organization.id,
      name: 'Globex',
      ownerId: other.id,
      createdAt: new Date(),
    });

    await expect(organizations.create(clash)).rejects.toBeInstanceOf(Conflict);
    await expect(membershipOf(organization, other)).resolves.toBeUndefined();
  });
});
