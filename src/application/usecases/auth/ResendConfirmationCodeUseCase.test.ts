import { beforeEach, describe, expect, it } from 'vitest';

import { FakeAuthGateway } from '@tests/fakes/FakeAuthGateway';
import { accountWorld, uniqueEmail } from '@tests/support/accountWorld';

import { TooManyRequests } from '@application/errors/common';
import { ResendConfirmationCodeUseCase } from '@application/usecases/auth/ResendConfirmationCodeUseCase';
import { SignUpUseCase } from '@application/usecases/auth/SignUpUseCase';

let auth: FakeAuthGateway;
let resendCode: ResendConfirmationCodeUseCase;
let email: string;

beforeEach(async () => {
  const world = accountWorld();
  auth = new FakeAuthGateway();
  resendCode = new ResendConfirmationCodeUseCase(world.accounts, auth);
  email = uniqueEmail('ana');
  await new SignUpUseCase(world.accounts, auth).execute({
    name: 'Ana',
    email,
    password: 'secret123',
  });
});

describe('ResendConfirmationCodeUseCase', () => {
  it('should send a new code to a pending account', async () => {
    await resendCode.execute({ email: ` ${email.toUpperCase()} ` });

    expect(auth.resends).toEqual([email]);
  });

  it('should send nothing when there is no pending account', async () => {
    await expect(
      resendCode.execute({ email: uniqueEmail('nobody') }),
    ).resolves.toBeUndefined();
    expect(auth.resends).toEqual([]);
  });

  it('should let the service limits through', async () => {
    auth.failOnResend = new TooManyRequests();

    await expect(resendCode.execute({ email })).rejects.toBeInstanceOf(
      TooManyRequests,
    );
  });
});
