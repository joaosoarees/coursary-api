import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { Conflict } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { OrganizationItem } from '@infra/database/dynamo/items/organization/OrganizationItem';
import { DynamoOrganizationRepository } from '@infra/database/dynamo/repositories/organization/DynamoOrganizationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const organizations = new DynamoOrganizationRepository(config);

const stored = async (organization: Organization) => {
  const { Item } = await dynamoClient.send(
    new GetCommand({
      TableName: config.mainTableName,
      Key: {
        PK: OrganizationItem.getPK(organization.id),
        SK: OrganizationItem.getSK(organization.id),
      },
      ConsistentRead: true,
    }),
  );

  return Item;
};

const owner = Account.create({ name: 'Ana', email: uniqueEmail('ana') });

describe('DynamoOrganizationRepository', () => {
  it('should store the organization with its owner', async () => {
    const organization = Organization.create({ owner, name: 'Acme' });

    await organizations.create(organization, Membership.ownerOf(organization));

    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: {
          PK: `ORG#${organization.id}`,
          SK: `MEMBER#${owner.id}`,
        },
        ConsistentRead: true,
      }),
    );
    expect(Item).toMatchObject({ role: 'OWNER', orgName: 'Acme' });
  });

  it('should refuse an id that is taken, writing nothing', async () => {
    const organization = Organization.create({ owner, name: 'Acme' });
    await organizations.create(organization, Membership.ownerOf(organization));
    const other = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
    const clash = new Organization({
      id: organization.id,
      name: 'Globex',
      ownerId: other.id,
      createdAt: new Date(),
    });

    await expect(
      organizations.create(clash, Membership.ownerOf(clash)),
    ).rejects.toBeInstanceOf(Conflict);

    const { Item } = await dynamoClient.send(
      new GetCommand({
        TableName: config.mainTableName,
        Key: { PK: `ORG#${organization.id}`, SK: `MEMBER#${other.id}` },
        ConsistentRead: true,
      }),
    );
    expect(Item).toBeUndefined();
  });

  it('should refuse an owner membership of another organization', async () => {
    const organization = Organization.create({ owner, name: 'Acme' });
    const other = Organization.create({ owner, name: 'Globex' });

    await expect(
      organizations.create(organization, Membership.ownerOf(other)),
    ).rejects.toThrow('does not match');
    await expect(stored(organization)).resolves.toBeUndefined();
  });
});
