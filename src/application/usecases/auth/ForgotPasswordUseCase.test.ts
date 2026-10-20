import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { accountWorld, uniqueEmail } from '@tests/support/accountWorld';

import { accountStatuses } from '@application/entities/account/Account';
import { ForgotPasswordUseCase } from '@application/usecases/auth/ForgotPasswordUseCase';

let world: ReturnType<typeof accountWorld>;
let auth: FakeAuthGateway;
let forgotPassword: ForgotPasswordUseCase;

beforeEach(() => {
  world = accountWorld();
  auth = new FakeAuthGateway();
  forgotPassword = new ForgotPasswordUseCase(world.accounts, auth);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('ForgotPasswordUseCase', () => {
  it('should send a reset code to an active account', async () => {
    const account = await world.addAccount();

    await forgotPassword.execute({ email: ` ${account.email.toUpperCase()} ` });

    expect(auth.resetCodesSent).toEqual([account.email]);
  });

  it.each([accountStatuses.Pending, accountStatuses.Disabled])(
    'should send nothing to a %s account',
    async (status) => {
      const account = await world.addAccount({ status });

      await forgotPassword.execute({ email: account.email });

      expect(auth.resetCodesSent).toEqual([]);
    },
  );

  it('should send nothing to an unknown e-mail', async () => {
    await forgotPassword.execute({ email: uniqueEmail('nobody') });

    expect(auth.resetCodesSent).toEqual([]);
  });
});
