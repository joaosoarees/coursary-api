import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { accountWorld, uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { InvalidCode } from '@application/errors/auth';
import { ConfirmSignUpUseCase } from '@application/usecases/auth/ConfirmSignUpUseCase';
import { SignUpUseCase } from '@application/usecases/auth/SignUpUseCase';

let world: ReturnType<typeof accountWorld>;
let auth: FakeAuthGateway;
let confirmSignUp: ConfirmSignUpUseCase;
let email: string;
let accountId: string;

const status = async () =>
  (await world.accounts.findById(Account.toId(accountId)))?.status;

beforeEach(async () => {
  world = accountWorld();
  auth = new FakeAuthGateway();
  confirmSignUp = new ConfirmSignUpUseCase(world.accounts, auth);
  email = uniqueEmail('ana');
  ({ accountId } = await new SignUpUseCase(world.accounts, auth).execute({
    name: 'Ana',
    email,
    password: 'secret123',
  }));
});

describe('ConfirmSignUpUseCase', () => {
  it('should confirm the user and activate the account', async () => {
    await confirmSignUp.execute({
      email: ` ${email.toUpperCase()} `,
      code: '123456',
    });

    expect(auth.users.get(email)).toBe('CONFIRMED');
    await expect(status()).resolves.toBe('ACTIVE');
  });

  it('should refuse a wrong code and keep the account pending', async () => {
    await expect(
      confirmSignUp.execute({ email, code: '000000' }),
    ).rejects.toBeInstanceOf(InvalidCode);
    await expect(status()).resolves.toBe('PENDING');
  });

  it('should refuse an e-mail without a pending account before asking the identity provider', async () => {
    const orphan = uniqueEmail('orphan');
    auth.users.set(orphan, 'UNCONFIRMED');
    auth.codes.set(orphan, '123456');

    await expect(
      confirmSignUp.execute({ email: orphan, code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidCode);
    expect(auth.users.get(orphan)).toBe('UNCONFIRMED');
  });

  it('should refuse an account that is already active', async () => {
    await confirmSignUp.execute({ email, code: '123456' });

    await expect(
      confirmSignUp.execute({ email, code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidCode);
  });

  it('should finish an activation that failed after the user was confirmed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(world.accounts, 'activate').mockRejectedValueOnce(
      new Error('table throttled'),
    );
    await expect(
      confirmSignUp.execute({ email, code: '123456' }),
    ).rejects.toThrow('table throttled');

    await confirmSignUp.execute({ email, code: 'any' });

    await expect(status()).resolves.toBe('ACTIVE');
    expect(JSON.parse(log.mock.calls[0]?.[0] as string)).toEqual({
      event: 'ConfirmedUserWithPendingAccount',
      accountId,
    });
  });

  it('should refuse when the identity provider has the user in another state', async () => {
    auth.users.set(email, 'CONFIRMED');
    vi.spyOn(auth, 'isUserConfirmed').mockResolvedValue(false);

    await expect(
      confirmSignUp.execute({ email, code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidCode);
    await expect(status()).resolves.toBe('PENDING');
  });
});
