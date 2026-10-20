import { beforeEach, describe, expect, it } from 'vitest';

import { accountWorld, uniqueEmail } from '@tests/support/accountWorld';

import {
  type Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountUnavailable } from '@application/errors/auth';
import { PromoteFirstAdminUseCase } from '@application/usecases/admin/PromoteFirstAdminUseCase';

let world: ReturnType<typeof accountWorld>;
let promote: PromoteFirstAdminUseCase;
let account: Account;

beforeEach(async () => {
  world = accountWorld();
  promote = new PromoteFirstAdminUseCase(world.accounts);
  account = await world.addAccount({ name: 'ana' });
});

describe('PromoteFirstAdminUseCase', () => {
  it('should make an active account admin and record who did it', async () => {
    await expect(
      promote.execute({ email: ` ${account.email.toUpperCase()} ` }),
    ).resolves.toEqual({ accountId: account.id, changed: true });
    await expect(world.stored(account)).resolves.toMatchObject({
      role: 'admin',
    });
    await expect(world.roleChanges(account)).resolves.toMatchObject([
      { fromRole: 'student', toRole: 'admin', changedBy: 'bootstrap' },
    ]);
  });

  it('should record nothing for an account that is already admin', async () => {
    await promote.execute({ email: account.email });

    await expect(promote.execute({ email: account.email })).resolves.toEqual({
      accountId: account.id,
      changed: false,
    });
    await expect(world.roleChanges(account)).resolves.toHaveLength(1);
  });

  it.each([accountStatuses.Pending, accountStatuses.Disabled])(
    'should refuse a %s account',
    async (status) => {
      const other = await world.addAccount({ name: 'bia', status });

      await expect(
        promote.execute({ email: other.email }),
      ).rejects.toBeInstanceOf(AccountUnavailable);
      await expect(world.roleChanges(other)).resolves.toEqual([]);
    },
  );

  it('should refuse an unknown e-mail', async () => {
    await expect(
      promote.execute({ email: uniqueEmail('nobody') }),
    ).rejects.toBeInstanceOf(AccountUnavailable);
  });
});
