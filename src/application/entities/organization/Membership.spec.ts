import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';

const owner = Account.create({ name: 'Ana', email: 'ana@example.com' });
const organization = Organization.create({ owner, name: 'Acme' });

const as = (role: Membership.Role) =>
  new Membership({
    orgId: organization.id,
    accountId: anAccountId(),
    orgName: organization.name,
    role,
    joinedAt: new Date(),
  });

describe('Membership', () => {
  it.each([
    ['OWNER', 'ADMIN', true],
    ['OWNER', 'MEMBER', true],
    ['OWNER', 'OWNER', false],
    ['ADMIN', 'MEMBER', false],
    ['ADMIN', 'ADMIN', false],
    ['MEMBER', 'MEMBER', false],
  ] as const)(
    'should let %s change the role of %s: %s',
    (actor, target, allowed) => {
      expect(as(actor).mayChangeRoleOf(as(target))).toBe(allowed);
    },
  );

  it.each([
    ['OWNER', 'ADMIN', true],
    ['OWNER', 'MEMBER', true],
    ['OWNER', 'OWNER', false],
    ['ADMIN', 'MEMBER', true],
    ['ADMIN', 'ADMIN', false],
    ['ADMIN', 'OWNER', false],
    ['MEMBER', 'MEMBER', false],
  ] as const)('should let %s remove %s: %s', (actor, target, allowed) => {
    expect(as(actor).mayRemove(as(target))).toBe(allowed);
  });
});
