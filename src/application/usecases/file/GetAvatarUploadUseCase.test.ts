import { describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { accountWorld } from '@tests/support/accountWorld';

import {
  type Account,
  accountStatuses,
} from '@application/entities/account/Account';
import type { File } from '@application/entities/file/File';
import { AccountUnavailable } from '@application/errors/auth';
import { FileNotFound } from '@application/errors/file';
import { GetAvatarUploadUseCase } from '@application/usecases/file/GetAvatarUploadUseCase';
import { RequestAvatarUploadUseCase } from '@application/usecases/file/RequestAvatarUploadUseCase';

const { addAccount, files, unitOfWork } = accountWorld();

const getUpload = new GetAvatarUploadUseCase(files);

const sendAvatar = async (account?: Account) => {
  const owner = account ?? (await addAccount());
  const { fileId } = await new RequestAvatarUploadUseCase(
    files,
    new FakeFileStorage(),
  ).execute({ account: owner, contentType: 'image/png' });
  const reference: File.Reference = {
    ownerType: 'account',
    ownerId: owner.id,
    purpose: 'avatar',
    id: fileId,
  };
  const file = await files.find(reference);

  if (!file) {
    throw new Error('The upload was not recorded.');
  }

  return { account: owner, fileId, file };
};

describe('GetAvatarUploadUseCase', () => {
  it('should show a waiting upload as pending', async () => {
    const { account, fileId } = await sendAvatar();

    await expect(getUpload.execute({ account, fileId })).resolves.toEqual({
      status: 'PENDING',
    });
  });

  it('should show a processed upload as processed', async () => {
    const { account, fileId, file } = await sendAvatar();
    file.process({ size: 10, variants: { '64': 'a.webp', '256': 'b.webp' } });
    const unit = unitOfWork();
    unit.add(files.markProcessedOperation(file));
    await unit.commit();

    await expect(getUpload.execute({ account, fileId })).resolves.toEqual({
      status: 'PROCESSED',
    });
  });

  it('should show a refused upload as failed', async () => {
    const { account, fileId, file } = await sendAvatar();
    file.fail(10);
    await files.markFailed(file);

    await expect(getUpload.execute({ account, fileId })).resolves.toEqual({
      status: 'FAILED',
    });
  });

  it("should not find another account's upload", async () => {
    const { fileId } = await sendAvatar();
    const stranger = await addAccount();

    await expect(
      getUpload.execute({ account: stranger, fileId }),
    ).rejects.toBeInstanceOf(FileNotFound);
  });

  it('should refuse an account that is not active', async () => {
    const { fileId } = await sendAvatar();
    const disabled = await addAccount({ status: accountStatuses.Disabled });

    await expect(
      getUpload.execute({ account: disabled, fileId }),
    ).rejects.toBeInstanceOf(AccountUnavailable);
  });
});
