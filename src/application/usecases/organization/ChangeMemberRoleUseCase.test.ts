import { beforeEach, describe, expect, it } from 'vitest';

import { organizationWorld } from '@tests/support/organizationWorld';

import { Conflict, Forbidden } from '@application/errors/common';
import { MemberNotFound } from '@application/errors/organization';
import { ChangeMemberRoleUseCase } from '@application/usecases/organization/ChangeMemberRoleUseCase';

let world: Awaited<ReturnType<typeof organizationWorld>>;
let changeRole: ChangeMemberRoleUseCase;

beforeEach(async () => {
  world = await organizationWorld();
  changeRole = new ChangeMemberRoleUseCase(
    world.membershipsOf,
    world.unitOfWork,
  );
});

describe('ChangeMemberRoleUseCase', () => {
  it('should let the owner promote a member and demote them back', async () => {
    const bia = world.anAccount('bia');
    await world.join(bia, 'MEMBER');

    await expect(
      changeRole.execute({
        actor: world.ownership,
        accountId: bia.id,
        role: 'ADMIN',
      }),
    ).resolves.toEqual({ accountId: bia.id, role: 'ADMIN' });
    await expect(world.roleOf(bia)).resolves.toBe('ADMIN');

    await changeRole.execute({
      actor: world.ownership,
      accountId: bia.id,
      role: 'MEMBER',
    });
    await expect(world.roleOf(bia)).resolves.toBe('MEMBER');
  });

  it('should refuse an admin, and anyone touching the owner', async () => {
    const bia = world.anAccount('bia');
    const caio = world.anAccount('caio');
    const admin = await world.join(bia, 'ADMIN');
    await world.join(caio, 'MEMBER');

    await expect(
      changeRole.execute({ actor: admin, accountId: caio.id, role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      changeRole.execute({
        actor: world.ownership,
        accountId: world.owner.id,
        role: 'MEMBER',
      }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(world.roleOf(caio)).resolves.toBe('MEMBER');
    await expect(world.roleOf(world.owner)).resolves.toBe('OWNER');
  });

  it('should answer not found for an account of another organization', async () => {
    const other = await organizationWorld('Globex');
    const bia = other.anAccount('bia');
    await other.join(bia, 'MEMBER');

    await expect(
      changeRole.execute({
        actor: world.ownership,
        accountId: bia.id,
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(MemberNotFound);
    await expect(other.roleOf(bia)).resolves.toBe('MEMBER');
  });

  it('should refuse an actor whose role changed since the request began', async () => {
    const bia = world.anAccount('bia');
    await world.join(bia, 'MEMBER');
    await world.join(world.owner, 'ADMIN');

    await expect(
      changeRole.execute({
        actor: world.ownership,
        accountId: bia.id,
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(Conflict);
    await expect(world.roleOf(bia)).resolves.toBe('MEMBER');
  });
});
