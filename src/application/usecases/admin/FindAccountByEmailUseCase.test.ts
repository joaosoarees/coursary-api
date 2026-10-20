import { beforeEach, describe, expect, it } from 'vitest';

import { accountWorld, uniqueEmail } from '@tests/support/accountWorld';

import {
  type Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountNotFound } from '@application/errors/account';
import { FindAccountByEmailUseCase } from '@application/usecases/admin/FindAccountByEmailUseCase';

let world: ReturnType<typeof accountWorld>;
let account: Account;

beforeEach(async () => {
  world = accountWorld();
  account = await world.addAccount({
    name: 'Ana',
    status: accountStatuses.Pending,
  });
});

describe('FindAccountByEmailUseCase', () => {
  it('should return the summary of the account with the e-mail', async () => {
    await expect(
      new FindAccountByEmailUseCase(world.accounts).execute({
        email: ` ${account.email.toUpperCase()}`,
      }),
    ).resolves.toEqual({
      id: account.id,
      name: 'Ana',
      email: account.email,
      role: 'student',
      status: 'PENDING',
      createdAt: account.createdAt.toISOString(),
    });
  });

  it('should answer not found for an unknown e-mail', async () => {
    await expect(
      new FindAccountByEmailUseCase(world.accounts).execute({
        email: uniqueEmail('bia'),
      }),
    ).rejects.toBeInstanceOf(AccountNotFound);
  });
});
