import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { organizationWorld } from '@tests/support/organizationWorld';

import type { Account } from '@application/entities/account/Account';
import { InvalidCursor } from '@application/errors/common';
import { dynamoClient } from '@infra/clients/dynamoClient';
import { AccountItem } from '@infra/database/dynamo/items/account/AccountItem';
import { DynamoListMembersQuery } from '@infra/database/dynamo/queries/organization/DynamoListMembersQuery';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const query = new DynamoListMembersQuery(config);

const save = (account: Account) =>
  dynamoClient.send(
    new PutCommand({
      TableName: config.mainTableName,
      Item: AccountItem.fromEntity(account).toItem(),
    }),
  );

describe('DynamoListMembersQuery', () => {
  it("should list the organization's members with their name and e-mail, and no one else", async () => {
    const acme = await organizationWorld('Acme');
    const globex = await organizationWorld('Globex');
    const bia = acme.anAccount('bia');
    await Promise.all([save(acme.owner), save(bia), save(globex.owner)]);
    await acme.join(bia, 'ADMIN');
    await globex.join(bia, 'MEMBER');

    const { items, nextCursor } = await query.execute({
      orgId: acme.organization.id,
      page: { limit: 20 },
    });

    expect(nextCursor).toBeNull();
    expect(
      items.map(({ accountId, name, email, role }) => ({
        accountId,
        name,
        email,
        role,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          accountId: acme.owner.id,
          name: 'ana',
          email: acme.owner.email,
          role: 'OWNER',
        },
        { accountId: bia.id, name: 'bia', email: bia.email, role: 'ADMIN' },
      ]),
    );
    expect(items).toHaveLength(2);
    expect(Object.keys(items[0] ?? {}).sort()).toEqual([
      'accountId',
      'email',
      'joinedAt',
      'name',
      'role',
    ]);
  });

  it("should page through the members and refuse another organization's cursor", async () => {
    const acme = await organizationWorld('Acme');
    const globex = await organizationWorld('Globex');
    const bia = acme.anAccount('bia');
    await Promise.all([save(acme.owner), save(bia)]);
    await acme.join(bia, 'MEMBER');

    const first = await query.execute({
      orgId: acme.organization.id,
      page: { limit: 1 },
    });
    const second = await query.execute({
      orgId: acme.organization.id,
      page: { limit: 1, cursor: first.nextCursor ?? undefined },
    });

    expect([...first.items, ...second.items]).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
    await expect(
      query.execute({
        orgId: globex.organization.id,
        page: { limit: 1, cursor: first.nextCursor ?? undefined },
      }),
    ).rejects.toBeInstanceOf(InvalidCursor);
  });
});
