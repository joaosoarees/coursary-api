import { beforeEach, describe, expect, it } from 'vitest';

import { accountWorld } from '@tests/support/accountWorld';
import { anAccountId } from '@tests/support/ids';

import type { Page } from '@application/contracts/Page';
import type { Account } from '@application/entities/account/Account';
import { AccountNotFound } from '@application/errors/account';
import type { ListRoleChangesQuery } from '@application/queries/admin/ListRoleChangesQuery';
import type { RoleChangeSummary } from '@application/queries/admin/RoleChangeSummary';
import { ListRoleChangesUseCase } from '@application/usecases/admin/ListRoleChangesUseCase';

const emptyPage = { items: [], nextCursor: null };

let world: ReturnType<typeof accountWorld>;
let account: Account;

beforeEach(async () => {
  world = accountWorld();
  account = await world.addAccount();
});

describe('ListRoleChangesUseCase', () => {
  const page: Page<RoleChangeSummary> = emptyPage;
  const query: ListRoleChangesQuery = {
    execute: () => Promise.resolve(page),
  };

  it('should list the changes of an existing account', async () => {
    await expect(
      new ListRoleChangesUseCase(world.accounts, query).execute({
        accountId: account.id,
        limit: 20,
        cursor: undefined,
      }),
    ).resolves.toBe(page);
  });

  it('should answer not found for an unknown account', async () => {
    await expect(
      new ListRoleChangesUseCase(world.accounts, query).execute({
        accountId: anAccountId(),
        limit: 20,
        cursor: undefined,
      }),
    ).rejects.toBeInstanceOf(AccountNotFound);
  });
});
