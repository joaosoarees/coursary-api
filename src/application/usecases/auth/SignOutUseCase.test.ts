import { describe, expect, it } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { FakeRealtimeConnections } from '@tests/fakes/FakeRealtimeConnections';
import { accountWorld } from '@tests/support/accountWorld';

import { SignOutUseCase } from '@application/usecases/auth/SignOutUseCase';

const { accounts, addAccount, stored } = accountWorld();
const session = { accessJti: 'jti-1', refreshTokenHash: 'hash-1' };

describe('SignOutUseCase', () => {
  it('should end the session, close the live connections and revoke the refresh token', async () => {
    const authGateway = new FakeAuthGateway();
    const realtime = new FakeRealtimeConnections();
    const account = await addAccount({ session });

    await new SignOutUseCase(accounts, authGateway, realtime).execute({
      callerId: account.id,
      refreshToken: 'refresh-1',
    });

    expect((await stored(account))?.session).toBeUndefined();
    expect(authGateway.revokedTokens).toEqual(['refresh-1']);
    expect(realtime.closed).toEqual([{ accountId: account.id }]);
  });

  it('should still end the session without a cookie', async () => {
    const authGateway = new FakeAuthGateway();
    const account = await addAccount({ session });

    await new SignOutUseCase(
      accounts,
      authGateway,
      new FakeRealtimeConnections(),
    ).execute({
      callerId: account.id,
      refreshToken: null,
    });

    expect((await stored(account))?.session).toBeUndefined();
    expect(authGateway.revokedTokens).toEqual([]);
  });
});
