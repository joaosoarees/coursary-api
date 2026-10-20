import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { accountWorld, uniqueEmail } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import {
  AuthUserExists,
  EmailInUse,
  InvalidPassword,
} from '@application/errors/auth';
import { SignUpUseCase } from '@application/usecases/auth/SignUpUseCase';

let world: ReturnType<typeof accountWorld>;
let auth: FakeAuthGateway;
let signUp: SignUpUseCase;
let email: string;
let input: { name: string; email: string; password: string };

beforeEach(() => {
  world = accountWorld();
  auth = new FakeAuthGateway();
  signUp = new SignUpUseCase(world.accounts, auth);
  email = uniqueEmail('ana');
  input = { name: 'Ana', email: email.toUpperCase(), password: 'secret123' };
});

describe('SignUpUseCase', () => {
  it('should create a pending account and a user carrying its id', async () => {
    const { accountId } = await signUp.execute(input);

    await expect(
      world.accounts.findById(Account.toId(accountId)),
    ).resolves.toMatchObject({
      email,
      status: 'PENDING',
      externalId: `sub-${email}`,
    });
    expect(auth.signUps[0]).toMatchObject({ email, internalId: accountId });
  });

  it('should refuse an e-mail already claimed without calling the identity provider', async () => {
    await signUp.execute(input);

    await expect(signUp.execute(input)).rejects.toBeInstanceOf(EmailInUse);
    expect(auth.signUps).toHaveLength(1);
  });

  it('should undo the account when the identity provider refuses the user', async () => {
    auth.failOnSignUp = new InvalidPassword();

    await expect(signUp.execute(input)).rejects.toBeInstanceOf(InvalidPassword);
    await expect(world.accounts.findByEmail(email)).resolves.toBeNull();
    await expect(world.isEmailFree(email)).resolves.toBe(true);
  });

  it('should undo the user and the account when saving the external id fails', async () => {
    vi.spyOn(world.accounts, 'saveExternalId').mockRejectedValue(
      new Error('table throttled'),
    );

    await expect(signUp.execute(input)).rejects.toThrow('table throttled');
    expect(auth.users.size).toBe(0);
    await expect(world.accounts.findByEmail(email)).resolves.toBeNull();
    await expect(world.isEmailFree(email)).resolves.toBe(true);
  });

  it('should replace an unconfirmed orphan left in the identity provider', async () => {
    auth.users.set(email, 'UNCONFIRMED');

    const { accountId } = await signUp.execute(input);

    expect(auth.signUps).toHaveLength(2);
    expect(auth.users.get(email)).toBe('UNCONFIRMED');
    await expect(
      world.accounts.findById(Account.toId(accountId)),
    ).resolves.not.toBeNull();
  });

  it('should keep a confirmed user, answer EmailInUse and free the new claim', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    auth.users.set(email, 'CONFIRMED');

    await expect(signUp.execute(input)).rejects.toBeInstanceOf(EmailInUse);
    expect(auth.users.get(email)).toBe('CONFIRMED');
    await expect(world.isEmailFree(email)).resolves.toBe(true);
  });

  it('should answer EmailInUse when the user reappears after the orphan is removed', async () => {
    auth.users.set(email, 'UNCONFIRMED');
    auth.failOnSignUp = new AuthUserExists(email);

    await expect(signUp.execute(input)).rejects.toBeInstanceOf(EmailInUse);
    await expect(world.isEmailFree(email)).resolves.toBe(true);
  });
});
