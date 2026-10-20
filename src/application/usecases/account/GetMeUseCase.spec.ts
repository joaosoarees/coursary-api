import { describe, expect, it } from 'vitest';

import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import { AccountUnavailable } from '@application/errors/auth';
import { GetMeUseCase } from '@application/usecases/account/GetMeUseCase';

const activeAccount = () => {
  const account = Account.create({ name: 'Ana', email: 'ana@example.com' });
  account.activate();

  return account;
};

describe('GetMeUseCase', () => {
  it('should return the profile of an active account', () => {
    const account = activeAccount();

    expect(new GetMeUseCase().execute({ account })).toEqual({
      id: account.id,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'student',
      createdAt: account.createdAt.toISOString(),
    });
  });

  it.each([accountStatuses.Disabled, accountStatuses.Pending])(
    'should refuse a %s account',
    (status) => {
      const account = activeAccount();
      account.status = status;

      expect(() => new GetMeUseCase().execute({ account })).toThrow(
        AccountUnavailable,
      );
    },
  );
});
