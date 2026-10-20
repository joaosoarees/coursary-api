import { beforeEach, describe, expect, it, vi } from 'vitest';

import { accountWorld } from '@tests/support/accountWorld';
import { anAccountId } from '@tests/support/ids';

import {
  type Account,
  accountRoles,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountNotActive, AccountNotFound } from '@application/errors/account';
import { CannotChangeOwnStatus } from '@application/errors/admin';
import { Forbidden } from '@application/errors/common';
import { ChangeStatusUseCase } from '@application/usecases/admin/ChangeStatusUseCase';

let world: ReturnType<typeof accountWorld>;
let changeStatus: ChangeStatusUseCase;
let admin: Account;
let target: Account;

beforeEach(async () => {
  world = accountWorld();
  changeStatus = new ChangeStatusUseCase(world.accounts);
  admin = await world.addAccount({ name: 'ana', role: accountRoles.Admin });
  target = await world.addAccount({
    name: 'bia',
    session: { accessJti: 'jti-1', refreshTokenHash: 'hash-1' },
  });
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

const disable = (accountId = target.id) =>
  changeStatus.execute({ callerId: admin.id, accountId, status: 'DISABLED' });

describe('ChangeStatusUseCase', () => {
  it('should disable the account, end its session and log who did it', async () => {
    await expect(disable()).resolves.toEqual({
      id: target.id,
      status: 'DISABLED',
    });
    await expect(world.stored(target)).resolves.toMatchObject({
      status: 'DISABLED',
      session: undefined,
    });
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining(`"changedBy":"${admin.id}"`),
    );
  });

  it('should enable a disabled account without bringing a session back', async () => {
    await disable();

    await changeStatus.execute({
      callerId: admin.id,
      accountId: target.id,
      status: 'ACTIVE',
    });

    await expect(world.stored(target)).resolves.toMatchObject({
      status: 'ACTIVE',
      session: undefined,
    });
  });

  it('should write nothing when the account already has the status', async () => {
    await disable();
    const changeStatusSpy = vi.spyOn(world.accounts, 'changeStatus');

    await expect(disable()).resolves.toEqual({
      id: target.id,
      status: 'DISABLED',
    });
    expect(changeStatusSpy).not.toHaveBeenCalled();
  });

  it('should refuse the caller own account', async () => {
    await expect(disable(admin.id)).rejects.toBeInstanceOf(
      CannotChangeOwnStatus,
    );
  });

  it('should refuse an account that does not exist', async () => {
    await expect(disable(anAccountId())).rejects.toBeInstanceOf(
      AccountNotFound,
    );
  });

  it('should refuse a pending account', async () => {
    const pending = await world.addAccount({
      name: 'caio',
      status: accountStatuses.Pending,
    });

    await expect(disable(pending.id)).rejects.toBeInstanceOf(AccountNotActive);
  });

  it('should refuse a caller who is no longer an active admin', async () => {
    admin.status = accountStatuses.Disabled;
    await world.save(admin);

    await expect(disable()).rejects.toBeInstanceOf(Forbidden);
    await expect(world.stored(target)).resolves.toMatchObject({
      status: 'ACTIVE',
    });
  });
});
