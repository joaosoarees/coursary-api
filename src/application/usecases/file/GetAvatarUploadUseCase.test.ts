import { describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { accountWorld } from '@tests/support/accountWorld';

import type { File } from '@application/entities/file/File';
import { FileNotFound } from '@application/errors/file';
import { GetAvatarUploadUseCase } from '@application/usecases/file/GetAvatarUploadUseCase';
import { RequestAvatarUploadUseCase } from '@application/usecases/file/RequestAvatarUploadUseCase';

const { addAccount, files } = accountWorld();

const getUpload = new GetAvatarUploadUseCase(files);

const sendAvatar = async () => {
  const account = await addAccount();
  const { fileId } = await new RequestAvatarUploadUseCase(
    files,
    new FakeFileStorage(),
  ).execute({ account, contentType: 'image/png' });
  const reference: File.Reference = {
    ownerType: 'account',
    ownerId: account.id,
    purpose: 'avatar',
    id: fileId,
  };

  return { account, fileId, reference };
};

describe('GetAvatarUploadUseCase', () => {
  it('should show a waiting upload as pending', async () => {
    const { account, fileId } = await sendAvatar();

    await expect(
      getUpload.execute({ callerId: account.id, fileId }),
    ).resolves.toEqual({ status: 'PENDING' });
  });

  it('should show a refused upload as failed', async () => {
    const { account, fileId, reference } = await sendAvatar();
    const file = await files.find(reference);
    file?.fail(10);
    if (file) {
      await files.markFailed(file);
    }

    await expect(
      getUpload.execute({ callerId: account.id, fileId }),
    ).resolves.toEqual({ status: 'FAILED' });
  });

  it("should not find another account's upload", async () => {
    const { fileId } = await sendAvatar();
    const stranger = await addAccount();

    await expect(
      getUpload.execute({ callerId: stranger.id, fileId }),
    ).rejects.toBeInstanceOf(FileNotFound);
  });
});
