import { beforeEach, describe, expect, it } from 'vitest';

import { accountWorld } from '@tests/support/accountWorld';
import { anAccountId } from '@tests/support/ids';

import {
  type Account,
  accountRoles,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountNotActive, AccountNotFound } from '@application/errors/account';
import { CannotChangeOwnRole } from '@application/errors/admin';
import { Forbidden } from '@application/errors/common';
import { ChangeRoleUseCase } from '@application/usecases/admin/ChangeRoleUseCase';

let world: ReturnType<typeof accountWorld>;
let changeRole: ChangeRoleUseCase;
let admin: Account;
let target: Account;

beforeEach(async () => {
  world = accountWorld();
  changeRole = new ChangeRoleUseCase(world.accounts);
  admin = await world.addAccount({ name: 'ana', role: accountRoles.Admin });
  target = await world.addAccount({ name: 'bia' });
});

describe('ChangeRoleUseCase', () => {
  it('should change the role and record who changed it', async () => {
    await expect(
      changeRole.execute({
        callerId: admin.id,
        accountId: target.id,
        role: accountRoles.Instructor,
      }),
    ).resolves.toEqual({ id: target.id, role: 'instructor' });
    await expect(world.stored(target)).resolves.toMatchObject({
      role: 'instructor',
    });
    await expect(world.roleChanges(target)).resolves.toMatchObject([
      { fromRole: 'student', toRole: 'instructor', changedBy: admin.id },
    ]);
  });

  it('should record nothing when the account already has the role', async () => {
    await expect(
      changeRole.execute({
        callerId: admin.id,
        accountId: target.id,
        role: accountRoles.Student,
      }),
    ).resolves.toEqual({ id: target.id, role: 'student' });
    await expect(world.roleChanges(target)).resolves.toHaveLength(0);
  });

  it('should refuse a change to the caller own role', async () => {
    await expect(
      changeRole.execute({
        callerId: admin.id,
        accountId: admin.id,
        role: accountRoles.Student,
      }),
    ).rejects.toBeInstanceOf(CannotChangeOwnRole);
  });

  it('should refuse an account that does not exist', async () => {
    await expect(
      changeRole.execute({
        callerId: admin.id,
        accountId: anAccountId(),
        role: accountRoles.Admin,
      }),
    ).rejects.toBeInstanceOf(AccountNotFound);
  });

  it('should refuse an account that is not active', async () => {
    const pending = await world.addAccount({
      name: 'caio',
      status: accountStatuses.Pending,
    });

    await expect(
      changeRole.execute({
        callerId: admin.id,
        accountId: pending.id,
        role: accountRoles.Admin,
      }),
    ).rejects.toBeInstanceOf(AccountNotActive);
  });

  it('should refuse a caller who is no longer admin', async () => {
    admin.role = accountRoles.Student;
    await world.save(admin);

    await expect(
      changeRole.execute({
        callerId: admin.id,
        accountId: target.id,
        role: accountRoles.Admin,
      }),
    ).rejects.toBeInstanceOf(Forbidden);
    await expect(world.roleChanges(target)).resolves.toHaveLength(0);
  });
});
