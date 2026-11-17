import { describe, expect, it } from 'vitest';

import type { Controller } from '@application/contracts/Controller';
import { OrgController } from '@application/contracts/OrgController';
import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { Forbidden } from '@application/errors/common';

class ManagersController extends OrgController<string> {
  protected override readonly orgRoles = ['OWNER', 'ADMIN'] as const;

  protected handle() {
    return Promise.resolve({ statusCode: 200, body: 'ok' });
  }
}

// @ts-expect-error: an organization route that names no roles does not compile.
class NoRolesController extends OrgController {
  protected handle() {
    return Promise.resolve({ statusCode: 204 });
  }
}

const owner = Account.create({ name: 'Ana', email: 'ana@example.com' });
const organization = Organization.create({ owner, name: 'Acme' });

const requestAs = (role: Membership.Role): Controller.Request<'org'> => ({
  accountId: owner.id,
  role: owner.role,
  account: owner,
  membership: new Membership({
    orgId: organization.id,
    accountId: owner.id,
    orgName: organization.name,
    role,
    joinedAt: organization.createdAt,
  }),
  body: {},
  params: {},
  queryParams: {},
  headers: {},
  cookies: {},
});

describe('OrgController', () => {
  it.each(['OWNER', 'ADMIN'] as const)(
    'should let %s through',
    async (role) => {
      await expect(
        new ManagersController().execute(requestAs(role)),
      ).resolves.toEqual({ statusCode: 200, body: 'ok' });
    },
  );

  it('should refuse a role outside the list even when called without the adapter', async () => {
    await expect(
      new ManagersController().execute(requestAs('MEMBER')),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('should be a class like any other at run time', () => {
    expect(new NoRolesController()).toBeInstanceOf(OrgController);
  });
});
