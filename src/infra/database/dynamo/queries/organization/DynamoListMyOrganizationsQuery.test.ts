import { describe, expect, it } from 'vitest';

import { uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { InvalidCursor } from '@application/errors/common';
import { DynamoListMyOrganizationsQuery } from '@infra/database/dynamo/queries/organization/DynamoListMyOrganizationsQuery';
import { DynamoOrganizationRepository } from '@infra/database/dynamo/repositories/organization/DynamoOrganizationRepository';
import { AppConfig } from '@shared/config/AppConfig';

const config = new AppConfig();
const organizations = new DynamoOrganizationRepository(config);
const query = new DynamoListMyOrganizationsQuery(config);

const found = async (owner: Account, name: string) => {
  const organization = Organization.create({ owner, name });
  await organizations.create(organization, Membership.ownerOf(organization));

  return organization;
};

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('DynamoListMyOrganizationsQuery', () => {
  it("should list only the caller's organizations, newest first, a page at a time", async () => {
    const ana = Account.create({ name: 'Ana', email: uniqueEmail('ana') });
    const bia = Account.create({ name: 'Bia', email: uniqueEmail('bia') });
    const acme = await found(ana, 'Acme');
    // KSUIDs order by the second.
    await wait(1100);
    const globex = await found(ana, 'Globex');
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
