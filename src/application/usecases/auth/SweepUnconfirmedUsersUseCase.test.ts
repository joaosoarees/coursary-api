import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { accountWorld, uniqueEmail } from '@tests/support/accountWorld';
import { anAccountId } from '@tests/support/ids';

import { accountStatuses } from '@application/entities/account/Account';
import { CleanUpExpiredSignUpUseCase } from '@application/usecases/auth/CleanUpExpiredSignUpUseCase';
import { SweepUnconfirmedUsersUseCase } from '@application/usecases/auth/SweepUnconfirmedUsersUseCase';

let world: ReturnType<typeof accountWorld>;
let authGateway: FakeAuthGateway;
let sweep: SweepUnconfirmedUsersUseCase;

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  world = accountWorld();
  authGateway = new FakeAuthGateway();
  sweep = new SweepUnconfirmedUsersUseCase(
    authGateway,
    world.accounts,
    new CleanUpExpiredSignUpUseCase(authGateway),
  );
});

const userFor = (email: string, internalId: string) =>
  authGateway.signUp({ email, password: 'x', internalId });

describe('SweepUnconfirmedUsersUseCase', () => {
  it('should delete the unconfirmed users whose account is gone, and keep the rest', async () => {
    const pending = await world.addAccount({ status: accountStatuses.Pending });
    await userFor(pending.email, pending.id);
    const orphan = uniqueEmail('orphan');
    await userFor(orphan, anAccountId());
    const strange = uniqueEmail('strange');
    await userFor(strange, 'not-an-id');

    await expect(sweep.execute()).resolves.toEqual({
      unconfirmed: 3,
      deleted: 1,
    });
    expect(authGateway.users.has(orphan)).toBe(false);
    expect(authGateway.users.has(pending.email)).toBe(true);
    expect(authGateway.users.has(strange)).toBe(true);
  });
});
