import { describe, expect, it } from 'vitest';

import { accountWorld } from '@tests/support/accountWorld';

import type { Account } from '@application/entities/account/Account';
import { File } from '@application/entities/file/File';
import { Conflict } from '@application/errors/common';
import { DynamoUnitOfWork } from '@infra/database/dynamo/DynamoUnitOfWork';
import { DynamoFileRepository } from '@infra/database/dynamo/repositories/file/DynamoFileRepository';
import { AppConfig } from '@shared/config/AppConfig';

const files = new DynamoFileRepository(new AppConfig());
const { accounts, addAccount, stored } = accountWorld();

const pendingAvatar = async (account: Account) => {
  const file = File.create({
    ownerId: account.id,
    purpose: 'avatar',
    contentType: 'image/png',
  });
  await files.create(file);

  return file;
};

// What the upload consumer commits for a processed avatar (Q85).
const processAvatar = async (account: Account, file: File) => {
  const previous = (await stored(account))?.avatar;
  const variants = { 64: `${file.id}-64.webp` };
  file.process({ size: 100, variants });

  const unit = new DynamoUnitOfWork();
  unit.add(
    files.markProcessedOperation(file),
    accounts.setAvatarOperation(
      account.id,
      { fileId: file.id, variants },
      previous?.fileId,
    ),
    ...(previous
      ? [
          files.deleteOperation({
            ownerType: file.ownerType,
            ownerId: file.ownerId,
            purpose: file.purpose,
            id: previous.fileId,
          }),
        ]
      : []),
  );
  await unit.commit();
};

describe('DynamoFileRepository', () => {
  it('should store a pending file once and read it back', async () => {
    const account = await addAccount();
    const file = await pendingAvatar(account);

    await expect(files.create(file)).rejects.toThrow();
    await expect(files.find(file)).resolves.toEqual(file);
  });

  it('should process the first avatar and copy it into the account', async () => {
    const account = await addAccount();
    const file = await pendingAvatar(account);

    await processAvatar(account, file);

    await expect(files.find(file)).resolves.toMatchObject({
      status: 'PROCESSED',
      size: 100,
    });
    expect((await stored(account))?.avatar).toEqual({
      fileId: file.id,
      variants: file.variants,
    });
  });

  it('should replace the avatar and delete the file it replaced', async () => {
    const account = await addAccount();
    const first = await pendingAvatar(account);
    await processAvatar(account, first);
    const second = await pendingAvatar(account);

    await processAvatar(account, second);

    expect((await stored(account))?.avatar?.fileId).toBe(second.id);
    await expect(files.find(first)).resolves.toBeNull();
  });

  it('should refuse a copy over an avatar the caller did not read', async () => {
    const account = await addAccount();
    const first = await pendingAvatar(account);
    const second = await pendingAvatar(account);
    await processAvatar(account, first);

    second.process({ size: 1, variants: {} });
    const unit = new DynamoUnitOfWork();
    unit.add(
      files.markProcessedOperation(second),
      accounts.setAvatarOperation(
        account.id,
        {
          fileId: second.id,
          variants: {},
        },
        undefined,
      ),
    );

    await expect(unit.commit()).rejects.toBeInstanceOf(Conflict);
    await expect(files.find(second)).resolves.toMatchObject({
      status: 'PENDING',
    });
  });

  it('should refuse to process a file twice', async () => {
    const account = await addAccount();
    const file = await pendingAvatar(account);
    await processAvatar(account, file);

    const unit = new DynamoUnitOfWork();
    unit.add(files.markProcessedOperation(file));

    await expect(unit.commit()).rejects.toBeInstanceOf(Conflict);
  });

  it('should fail only a pending file', async () => {
    const account = await addAccount();
    const pending = await pendingAvatar(account);
    const processed = await pendingAvatar(account);
    await processAvatar(account, processed);

    pending.fail(7);
    await files.markFailed(pending);
    processed.fail(7);
    await files.markFailed(processed);

    await expect(files.find(pending)).resolves.toMatchObject({
      status: 'FAILED',
      size: 7,
    });
    await expect(files.find(processed)).resolves.toMatchObject({
      status: 'PROCESSED',
    });
  });
});
