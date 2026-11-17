import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';

const owner = Account.create({ name: 'Ana', email: 'ana@example.com' });

describe('Organization', () => {
  it('should be created by its owner with a trimmed name', () => {
    const organization = Organization.create({ owner, name: '  Acme  ' });

    expect(organization).toMatchObject({ name: 'Acme', ownerId: owner.id });
    expect(Organization.isId(organization.id)).toBe(true);
  });

  it.each(['', 'not-a-ksuid', '0'.repeat(26)])(
    'should refuse %j as an id',
    (value) => {
      expect(() => Organization.toId(value)).toThrow(TypeError);
    },
  );

  it('should give its owner the OWNER membership', () => {
    const organization = Organization.create({ owner, name: 'Acme' });

    expect(Membership.ownerOf(organization)).toEqual(
      new Membership({
        orgId: organization.id,
        accountId: owner.id,
        orgName: 'Acme',
        role: 'OWNER',
        joinedAt: organization.createdAt,
      }),
    );
  });
});
