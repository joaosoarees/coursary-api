import { DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { Conflict } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { MembershipItem } from '@infra/database/dynamo/items/organization/MembershipItem';
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

const join = async (
  organization: Organization,
  account: Account,
  role: Membership.Role,
) => {
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

const commit = async (...operations: Parameters<DynamoUnitOfWork['add']>) => {
  const unit = new DynamoUnitOfWork();
  unit.add(...operations);
  await unit.commit();
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

  describe('writes', () => {
    it('should change a role while the actor still holds theirs', async () => {
      const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
      const bia = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
      const acme = await found(ana, 'Acme');
      const memberships = new DynamoMembershipRepository(config, acme.id);
      const owner = Membership.ownerOf(acme);
      const target = await join(acme, bia, 'MEMBER');

      await commit(
        memberships.heldOperation(owner),
        memberships.changeRoleOperation(target, 'ADMIN'),
      );

      await expect(memberships.find(bia.id)).resolves.toMatchObject({
        role: 'ADMIN',
      });
    });

    it('should refuse a change made on a stale read, writing nothing', async () => {
      const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
      const bia = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
      const acme = await found(ana, 'Acme');
      const memberships = new DynamoMembershipRepository(config, acme.id);
      const read = await join(acme, bia, 'MEMBER');
      await join(acme, bia, 'ADMIN');

      await expect(
        commit(memberships.changeRoleOperation(read, 'ADMIN')),
      ).rejects.toBeInstanceOf(Conflict);
      await expect(
        commit(memberships.removeOperation(read)),
      ).rejects.toBeInstanceOf(Conflict);
      await expect(memberships.find(bia.id)).resolves.toMatchObject({
        role: 'ADMIN',
      });
    });

    it('should refuse a write by an actor demoted a moment ago', async () => {
      const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
      const bia = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
      const caio = Account.create({ name: 'Caio', email: uniqueEmail('caio') });
      const acme = await found(ana, 'Acme');
      const memberships = new DynamoMembershipRepository(config, acme.id);
      const admin = await join(acme, bia, 'ADMIN');
      const target = await join(acme, caio, 'MEMBER');
      await join(acme, bia, 'MEMBER');

      await expect(
        commit(
          memberships.heldOperation(admin),
          memberships.removeOperation(target),
        ),
      ).rejects.toBeInstanceOf(Conflict);
      await expect(memberships.find(caio.id)).resolves.not.toBeNull();
    });

    it('should remove a membership', async () => {
      const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
      const bia = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
      const acme = await found(ana, 'Acme');
      const memberships = new DynamoMembershipRepository(config, acme.id);
      const target = await join(acme, bia, 'MEMBER');

      await commit(memberships.removeOperation(target));

      await expect(memberships.find(bia.id)).resolves.toBeNull();
    });

    it("should refuse to write another organization's membership", async () => {
      const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
      const acme = await found(ana, 'Acme');
      const globex = await found(ana, 'Globex');
      const memberships = new DynamoMembershipRepository(config, acme.id);

      expect(() =>
        memberships.removeOperation(Membership.ownerOf(globex)),
      ).toThrow('another organization');
    });
  });
});
