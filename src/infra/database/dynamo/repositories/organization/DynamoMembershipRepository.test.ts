import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { Organization } from '@application/entities/organization/Organization';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoMembershipRepository } from '@infra/database/dynamo/repositories/organization/DynamoMembershipRepository';
import { DynamoOrganizationRepository } from '@infra/database/dynamo/repositories/organization/DynamoOrganizationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const organizations = new DynamoOrganizationRepository(config);

const found = async (owner: Account, name: string) => {
  const organization = Organization.create({ owner, name });
  await organizations.create(organization);

  return organization;
};

describe('DynamoMembershipRepository', () => {
  it('should find a membership only in the organization it was built for', async () => {
    const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
    const bia = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
    const acme = await found(ana, 'Acme');
    const globex = await found(bia, 'Globex');

    await expect(
      new DynamoMembershipRepository(config, acme.id).find(ana.id),
    ).resolves.toMatchObject({ orgId: acme.id, role: 'OWNER' });
    await expect(
      new DynamoMembershipRepository(config, globex.id).find(ana.id),
    ).resolves.toBeNull();
  });

  it('should not find a membership removed a moment ago', async () => {
    const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
    const acme = await found(ana, 'Acme');
    await dynamoClient.send(
      new DeleteCommand({
        TableName: config.mainTableName,
        Key: { PK: `ORG#${acme.id}`, SK: `MEMBER#${ana.id}` },
      }),
    );

    await expect(
      new DynamoMembershipRepository(config, acme.id).find(ana.id),
    ).resolves.toBeNull();
  });

  it.each([undefined, '', 'not-an-id'])(
    'should refuse to be built for %j',
    (orgId) => {
      expect(
        () => new DynamoMembershipRepository(config, orgId as Organization.Id),
      ).toThrow(TypeError);
    },
  );
});
