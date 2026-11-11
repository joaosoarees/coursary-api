import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { FakeRealtimeConnections } from '@tests/fakes/FakeRealtimeConnections';
import { accountWorld } from '@tests/support/accountWorld';

import type { Account } from '@application/entities/account/Account';
import { InvalidCode } from '@application/errors/auth';
import { ResetPasswordUseCase } from '@application/usecases/auth/ResetPasswordUseCase';

const session = { accessJti: 'jti-1', refreshTokenHash: 'hash-1' };

let world: ReturnType<typeof accountWorld>;
let auth: FakeAuthGateway;
let realtime: FakeRealtimeConnections;
let account: Account;
let resetPassword: ResetPasswordUseCase;
let params: { email: string; code: string; newPassword: string };

beforeEach(async () => {
  world = accountWorld();
  auth = new FakeAuthGateway();
  account = await world.addAccount({ session });
  realtime = new FakeRealtimeConnections();
  resetPassword = new ResetPasswordUseCase(world.accounts, auth, realtime);
  params = {
    email: ` ${account.email.toUpperCase()} `,
    code: '012345',
    newPassword: 'newsecret1',
  };
});

describe('ResetPasswordUseCase', () => {
  it('should set the new password, end the session and close its connections', async () => {
    await resetPassword.execute(params);

    expect(auth.passwordResets).toEqual([{ ...params, email: account.email }]);
    await expect(world.stored(account)).resolves.toMatchObject({
      session: undefined,
    });
    expect(realtime.closed).toEqual([{ accountId: account.id }]);
  });

  it('should end no session when the code is refused', async () => {
    auth.failOnReset = new InvalidCode();

    await expect(resetPassword.execute(params)).rejects.toBeInstanceOf(
      InvalidCode,
    );
    await expect(world.stored(account)).resolves.toMatchObject({ session });
    expect(realtime.closed).toEqual([]);
  });

  it('should still succeed when the session could not be ended', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(world.accounts, 'clearSession').mockRejectedValue(
      new Error('throttled'),
    );

    await expect(resetPassword.execute(params)).resolves.toBeUndefined();
    expect(log.mock.calls[0]?.[0]).toMatchObject({
      event: 'SessionsNotRevoked',
    });
  });
});
