import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { anAccountId } from '@tests/support/ids';

import { Account } from '@application/entities/account/Account';
import { CleanUpExpiredSignUpUseCase } from '@application/usecases/auth/CleanUpExpiredSignUpUseCase';

const email = 'ana@example.com';
let authGateway: FakeAuthGateway;
let cleanUp: CleanUpExpiredSignUpUseCase;

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  authGateway = new FakeAuthGateway();
  cleanUp = new CleanUpExpiredSignUpUseCase(authGateway);
});

const signUp = async () => {
  const accountId = Account.toId(anAccountId());
  await authGateway.signUp({ email, password: 'x', internalId: accountId });

  return accountId;
};

describe('CleanUpExpiredSignUpUseCase', () => {
  it('should delete the unconfirmed user of the expired account', async () => {
    const accountId = await signUp();

    await expect(cleanUp.execute({ accountId, email })).resolves.toBe(
      'deleted',
    );
    expect(authGateway.users.has(email)).toBe(false);
  });

  it('should leave a new sign-up with the same e-mail alone, and log it', async () => {
    await signUp();
    const expired = Account.toId(anAccountId());

    await expect(cleanUp.execute({ accountId: expired, email })).resolves.toBe(
      'other-account',
    );
    expect(authGateway.users.get(email)).toBe('UNCONFIRMED');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('CleanupSkipped'),
    );
  });

  it('should never delete a user that confirmed', async () => {
    const accountId = await signUp();
    await authGateway.confirmSignUp(email, '123456');

    await expect(cleanUp.execute({ accountId, email })).resolves.toBe(
      'confirmed',
    );
    expect(authGateway.users.get(email)).toBe('CONFIRMED');
  });

  it('should be done when the user is already gone', async () => {
    await expect(
      cleanUp.execute({ accountId: Account.toId(anAccountId()), email }),
    ).resolves.toBe('not-found');
  });
});
