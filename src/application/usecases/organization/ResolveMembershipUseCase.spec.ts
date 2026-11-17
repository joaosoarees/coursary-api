import { describe, expect, it } from 'vitest';

import { anAccountId } from '@tests/support/ids';

import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { NotAMember } from '@application/errors/organization';
import type { MembershipRepository } from '@application/repositories/organization/MembershipRepository';
import { ResolveMembershipUseCase } from '@application/usecases/organization/ResolveMembershipUseCase';

const owner = Account.create({ name: 'Ana', email: 'ana@example.com' });
const acme = Organization.create({ owner, name: 'Acme' });
const globex = Organization.create({ owner, name: 'Globex' });

const asked: Organization.Id[] = [];
const unused = (): never => {
  throw new Error('Resolving reads only.');
};
const membershipsOf: MembershipRepository.ForOrg = (orgId) => {
  asked.push(orgId);

  return {
    find: (accountId) =>
      Promise.resolve(
        orgId === acme.id && accountId === owner.id
          ? Membership.ownerOf(acme)
          : null,
      ),
    heldOperation: unused,
    changeRoleOperation: unused,
    removeOperation: unused,
  };
};

const resolve = new ResolveMembershipUseCase(membershipsOf);

describe('ResolveMembershipUseCase', () => {
  it('should answer the membership of the organization asked for', async () => {
    asked.length = 0;

    await expect(
      resolve.execute({ orgId: acme.id, accountId: owner.id }),
    ).resolves.toEqual(Membership.ownerOf(acme));
    expect(asked).toEqual([acme.id]);
  });

  it.each([
    ['another organization', globex.id, owner.id],
    ['another account', acme.id, anAccountId()],
  ])('should refuse %s as not a member', async (_, orgId, accountId) => {
    await expect(resolve.execute({ orgId, accountId })).rejects.toBeInstanceOf(
      NotAMember,
    );
  });
});
