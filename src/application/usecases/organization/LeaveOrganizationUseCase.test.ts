import { beforeEach, describe, expect, it } from 'vitest';

import { organizationWorld } from '@tests/support/organizationWorld';

import { Conflict, Forbidden } from '@application/errors/common';
import { LeaveOrganizationUseCase } from '@application/usecases/organization/LeaveOrganizationUseCase';

let world: Awaited<ReturnType<typeof organizationWorld>>;
let leave: LeaveOrganizationUseCase;

beforeEach(async () => {
  world = await organizationWorld();
  leave = new LeaveOrganizationUseCase(world.membershipsOf, world.unitOfWork);
});

describe('LeaveOrganizationUseCase', () => {
  it('should let a member leave', async () => {
    const bia = world.anAccount('bia');
    const membership = await world.join(bia, 'MEMBER');

    await leave.execute({ membership });

    await expect(world.roleOf(bia)).resolves.toBeNull();
  });

  it('should keep the owner in', async () => {
    await expect(
      leave.execute({ membership: world.ownership }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(world.roleOf(world.owner)).resolves.toBe('OWNER');
  });

  it('should refuse a membership whose role changed since the request began', async () => {
    const bia = world.anAccount('bia');
    const membership = await world.join(bia, 'MEMBER');
    await world.join(bia, 'ADMIN');

    await expect(leave.execute({ membership })).rejects.toBeInstanceOf(
      Conflict,
    );
  });
});
