import KSUID from 'ksuid';
import { describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { Organization } from '@application/entities/organization/Organization';
import { InvalidCursor } from '@application/errors/common';
import { DynamoListMyOrganizationsQuery } from '@infra/database/dynamo/queries/organization/DynamoListMyOrganizationsQuery';
import { DynamoOrganizationRepository } from '@infra/database/dynamo/repositories/organization/DynamoOrganizationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const organizations = new DynamoOrganizationRepository(config);
const query = new DynamoListMyOrganizationsQuery(config);

const found = async (owner: Account, name: string, day = 1) => {
  const createdAt = new Date(Date.UTC(2026, 0, day));
  const organization = new Organization({
    id: Organization.toId(KSUID.randomSync(createdAt).string),
    name,
    ownerId: owner.id,
    createdAt,
  });
  await organizations.create(organization);

  return organization;
};

describe('DynamoListMyOrganizationsQuery', () => {
  it("should list only the caller's organizations, newest first, a page at a time", async () => {
    const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
    const bia = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
    const acme = await found(ana, 'Acme', 1);
    const globex = await found(ana, 'Globex', 2);
    await found(bia, 'Initech');

    const first = await query.execute({
      accountId: ana.id,
      page: { limit: 1 },
    });
    expect(first.items).toEqual([
      expect.objectContaining({ id: globex.id, name: 'Globex', role: 'OWNER' }),
    ]);
    expect(first.nextCursor).not.toBeNull();

    const second = await query.execute({
      accountId: ana.id,
      page: { limit: 1, cursor: first.nextCursor ?? undefined },
    });
    expect(second).toEqual({
      items: [expect.objectContaining({ id: acme.id })],
      nextCursor: null,
    });
  });

  it("should refuse another account's cursor", async () => {
    const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
    const bia = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
    await found(ana, 'Acme');
    await found(ana, 'Globex');
    const { nextCursor } = await query.execute({
      accountId: ana.id,
      page: { limit: 1 },
    });

    await expect(
      query.execute({
        accountId: bia.id,
        page: { limit: 1, cursor: nextCursor ?? undefined },
      }),
    ).rejects.toBeInstanceOf(InvalidCursor);
  });
});
