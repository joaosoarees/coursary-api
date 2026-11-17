import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { Membership } from '@application/entities/organization/Membership';
import { Organization } from '@application/entities/organization/Organization';
import { MembershipItem } from '@infra/database/dynamo/items/organization/MembershipItem';
import { OrganizationItem } from '@infra/database/dynamo/items/organization/OrganizationItem';

const owner = Account.create({ name: 'Ana', email: 'ana@example.com' });
const organization = Organization.create({ owner, name: 'Acme' });
const membership = Membership.ownerOf(organization);

describe('OrganizationItem', () => {
  it('should be the head of its own partition', () => {
    expect(OrganizationItem.fromEntity(organization).toItem()).toMatchObject({
      PK: `ORG#${organization.id}`,
      SK: `ORG#${organization.id}`,
      type: 'Organization',
    });
  });

  it('should come back as the same organization', () => {
    expect(
      OrganizationItem.toEntity(
        OrganizationItem.fromEntity(organization).toItem(),
      ),
    ).toEqual(organization);
  });
});

describe('MembershipItem', () => {
  it("should sit in the organization's partition and list under the account", () => {
    expect(MembershipItem.fromEntity(membership).toItem()).toMatchObject({
      PK: `ORG#${organization.id}`,
      SK: `MEMBER#${owner.id}`,
      GSI1PK: `MEMBERSHIPS#${owner.id}`,
      GSI1SK: `ORG#${organization.id}`,
      type: 'Membership',
    });
  });

  it('should come back as the same membership', () => {
    expect(
      MembershipItem.toEntity(MembershipItem.fromEntity(membership).toItem()),
    ).toEqual(membership);
  });
});
