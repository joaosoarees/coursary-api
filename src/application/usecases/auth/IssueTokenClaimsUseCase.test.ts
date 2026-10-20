import { beforeEach, describe, expect, it } from 'vitest';

import { accountWorld } from '@tests/support/accountWorld';
import { anAccountId } from '@tests/support/ids';

import { accountStatuses } from '@application/entities/account/Account';
import { AccountUnavailable } from '@application/errors/auth';
import { IssueTokenClaimsUseCase } from '@application/usecases/auth/IssueTokenClaimsUseCase';

let world: ReturnType<typeof accountWorld>;
let issueClaims: IssueTokenClaimsUseCase;

beforeEach(() => {
  world = accountWorld();
  issueClaims = new IssueTokenClaimsUseCase(world.accounts);
});

describe('IssueTokenClaimsUseCase', () => {
  it('should give the internal id and the role of an active account', async () => {
    const account = await world.addAccount();

    await expect(
      issueClaims.execute({ internalId: account.id }),
    ).resolves.toEqual({ internalId: account.id, role: 'student' });
  });

  it('should refuse an account that does not exist', async () => {
    await expect(
      issueClaims.execute({ internalId: anAccountId() }),
    ).rejects.toBeInstanceOf(AccountUnavailable);
  });

  it.each([accountStatuses.Pending, accountStatuses.Disabled])(
    'should refuse a %s account',
    async (status) => {
      const account = await world.addAccount({ status });

      await expect(
        issueClaims.execute({ internalId: account.id }),
      ).rejects.toBeInstanceOf(AccountUnavailable);
    },
  );
});
