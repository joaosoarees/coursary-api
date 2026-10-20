import { beforeEach, describe, expect, it } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { accountWorld } from '@tests/support/accountWorld';

import { Account } from '@application/entities/account/Account';
import { InvalidSession } from '@application/errors/auth';
import { RefreshTokensUseCase } from '@application/usecases/auth/RefreshTokensUseCase';
import { SignInUseCase } from '@application/usecases/auth/SignInUseCase';

let world: ReturnType<typeof accountWorld>;
let auth: FakeAuthGateway;
let account: Account;
let signIn: SignInUseCase;
let refresh: RefreshTokensUseCase;
let credentials: { email: string; password: string };

beforeEach(async () => {
  world = accountWorld();
  auth = new FakeAuthGateway();
  account = await world.addAccount();
  auth.accountIds.set(account.email, account.id);
  signIn = new SignInUseCase(world.accounts, auth);
  refresh = new RefreshTokensUseCase(world.accounts, auth);
  credentials = {
    email: ` ${account.email.toUpperCase()} `,
    password: 'secret123',
  };
});

const storedSession = async () => (await world.stored(account))?.session;

describe('SignInUseCase', () => {
  it('should sign in with the normalized e-mail and keep the new session', async () => {
    const tokens = await signIn.execute(credentials);

    expect(tokens).toEqual({
      accessToken: 'access',
      refreshToken: `refresh-${account.email}-0`,
      expiresIn: 3600,
    });
    await expect(storedSession()).resolves.toEqual({
      accessJti: 'jti-1',
      refreshTokenHash: Account.hashRefreshToken(`refresh-${account.email}-0`),
    });
  });

  it('should replace the session of an earlier sign-in', async () => {
    const first = await signIn.execute(credentials);
    await signIn.execute(credentials);

    await expect(storedSession()).resolves.toMatchObject({
      accessJti: 'jti-2',
    });
    await expect(
      refresh.execute({ refreshToken: first.refreshToken }),
    ).rejects.toBeInstanceOf(InvalidSession);
  });
});

describe('RefreshTokensUseCase', () => {
  it('should rotate the session from the refresh token it holds', async () => {
    const first = await signIn.execute(credentials);

    const tokens = await refresh.execute({ refreshToken: first.refreshToken });

    await expect(storedSession()).resolves.toEqual({
      accessJti: 'jti-2',
      refreshTokenHash: Account.hashRefreshToken(tokens.refreshToken),
    });
  });

  it('should refuse a refresh token that was rotated out', async () => {
    const first = await signIn.execute(credentials);
    await refresh.execute({ refreshToken: first.refreshToken });

    await expect(
      refresh.execute({ refreshToken: first.refreshToken }),
    ).rejects.toBeInstanceOf(InvalidSession);
  });
});
