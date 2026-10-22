import { describe, expect, it } from 'vitest';

import { FakePublicAssetUrls } from '@tests/fakes/FakePublicAssetUrls';

import {
  Account,
  accountStatuses,
} from '@application/entities/account/Account';
import type { File } from '@application/entities/file/File';
import { AccountUnavailable } from '@application/errors/auth';
import { GetMeUseCase } from '@application/usecases/account/GetMeUseCase';

const activeAccount = () => {
  const account = Account.create({ name: 'Ana', email: 'ana@example.com' });
  account.activate();

  return account;
};

const getMe = new GetMeUseCase(new FakePublicAssetUrls());

describe('GetMeUseCase', () => {
  it('should return the profile of an active account', () => {
    const account = activeAccount();

    expect(getMe.execute({ account })).toEqual({
      id: account.id,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'student',
      createdAt: account.createdAt.toISOString(),
    });
  });

  it('should serve each avatar variant from the CDN', () => {
    const account = activeAccount();
    account.avatar = {
      fileId: 'f' as File.Id,
      variants: { 64: 'account/a/64-x.webp', 256: 'account/a/256-y.webp' },
    };

    expect(getMe.execute({ account }).avatarUrl).toEqual({
      64: 'https://cdn.example.com/account/a/64-x.webp',
      256: 'https://cdn.example.com/account/a/256-y.webp',
    });
  });

  it.each([accountStatuses.Disabled, accountStatuses.Pending])(
    'should refuse a %s account',
    (status) => {
      const account = activeAccount();
      account.status = status;

      expect(() => getMe.execute({ account })).toThrow(AccountUnavailable);
    },
  );
});
