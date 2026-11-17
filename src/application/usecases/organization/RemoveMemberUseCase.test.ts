import { beforeEach, describe, expect, it } from 'vitest';

import { organizationWorld } from '@tests/support/organizationWorld';

import { Conflict, Forbidden } from '@application/errors/common';
import { MemberNotFound } from '@application/errors/organization';
import { RemoveMemberUseCase } from '@application/usecases/organization/RemoveMemberUseCase';

let world: Awaited<ReturnType<typeof organizationWorld>>;
let removeMember: RemoveMemberUseCase;

beforeEach(async () => {
  world = await organizationWorld();
  removeMember = new RemoveMemberUseCase(world.membershipsOf, world.unitOfWork);
});

describe('RemoveMemberUseCase', () => {
  it('should let the owner remove an admin and an admin remove a member', async () => {
    const bia = world.anAccount('bia');
    const caio = world.anAccount('caio');
    const dani = world.anAccount('dani');
    const admin = await world.join(bia, 'ADMIN');
    await world.join(caio, 'MEMBER');
    await world.join(dani, 'ADMIN');

    await removeMember.execute({ actor: admin, accountId: caio.id });
    await removeMember.execute({ actor: world.ownership, accountId: dani.id });

    await expect(world.roleOf(caio)).resolves.toBeNull();
    await expect(world.roleOf(dani)).resolves.toBeNull();
  });

  it('should refuse an admin removing an admin, and anyone removing the owner', async () => {
    const bia = world.anAccount('bia');
    const caio = world.anAccount('caio');
    const admin = await world.join(bia, 'ADMIN');
    await world.join(caio, 'ADMIN');

    await expect(
      removeMember.execute({ actor: admin, accountId: caio.id }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      removeMember.execute({ actor: admin, accountId: world.owner.id }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(
      removeMember.execute({
        actor: world.ownership,
        accountId: world.owner.id,
      }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(world.roleOf(caio)).resolves.toBe('ADMIN');
    await expect(world.roleOf(world.owner)).resolves.toBe('OWNER');
  });

  it('should answer not found for an account of another organization, leaving it there', async () => {
    const other = await organizationWorld('Globex');

    await expect(
      removeMember.execute({
        actor: world.ownership,
        accountId: other.owner.id,
      }),
    ).rejects.toBeInstanceOf(MemberNotFound);
    await expect(other.roleOf(other.owner)).resolves.toBe('OWNER');
  });

  it('should refuse an admin demoted since the request began', async () => {
    const bia = world.anAccount('bia');
    const caio = world.anAccount('caio');
    const admin = await world.join(bia, 'ADMIN');
    await world.join(caio, 'MEMBER');
    await world.join(bia, 'MEMBER');

    await expect(
      removeMember.execute({ actor: admin, accountId: caio.id }),
    ).rejects.toBeInstanceOf(Conflict);
    await expect(world.roleOf(caio)).resolves.toBe('MEMBER');
  });
});
