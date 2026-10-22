import { describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { accountWorld } from '@tests/support/accountWorld';

import { accountStatuses } from '@application/entities/account/Account';
import { AccountUnavailable } from '@application/errors/auth';
import { RequestAvatarUploadUseCase } from '@application/usecases/file/RequestAvatarUploadUseCase';

const { addAccount, files } = accountWorld();

const setup = () => {
  const storage = new FakeFileStorage();

  return {
    storage,
    requestUpload: new RequestAvatarUploadUseCase(files, storage),
  };
};

describe('RequestAvatarUploadUseCase', () => {
  it('should record a pending avatar and sign its original key', async () => {
    const { storage, requestUpload } = setup();
    const account = await addAccount();

    const { fileId, url, fields } = await requestUpload.execute({
      account,
      contentType: 'image/png',
    });

    const file = await files.find({
      ownerType: 'account',
      ownerId: account.id,
      purpose: 'avatar',
      id: fileId,
    });
    expect(file).toMatchObject({ status: 'PENDING', contentType: 'image/png' });
    expect(storage.signed).toEqual([
      {
        key: `account/${account.id}/avatar/${fileId}/original`,
        contentType: 'image/png',
        maxBytes: 5 * 1024 * 1024,
      },
    ]);
    expect(url).toContain('private-bucket');
    expect(fields.key).toBe(file?.originalKey);
  });

  it('should refuse an account that is not active, without recording anything', async () => {
    const { storage, requestUpload } = setup();
    const account = await addAccount({ status: accountStatuses.Disabled });

    await expect(
      requestUpload.execute({ account, contentType: 'image/png' }),
    ).rejects.toBeInstanceOf(AccountUnavailable);
    expect(storage.signed).toEqual([]);
  });
});
