import { describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { FakeImageProcessor } from '@tests/fakes/FakeImageProcessor';
import { accountWorld } from '@tests/support/accountWorld';

import type { Account } from '@application/entities/account/Account';
import { File } from '@application/entities/file/File';
import { AccountAvatarOwner } from '@application/usecases/file/AccountAvatarOwner';
import { CourseCoverOwner } from '@application/usecases/file/CourseCoverOwner';
import { ProcessUploadUseCase } from '@application/usecases/file/ProcessUploadUseCase';

const { accounts, addAccount, courses, files, stored, unitOfWork } =
  accountWorld();

const setup = () => {
  const storage = new FakeFileStorage();
  const images = new FakeImageProcessor();
  const processUpload = new ProcessUploadUseCase(
    files,
    {
      avatar: new AccountAvatarOwner(accounts),
      cover: new CourseCoverOwner(courses),
    },
    storage,
    images,
    unitOfWork,
  );

  // A pending avatar whose object S3 stored, as the route and the POST leave it.
  const upload = async (account: Account, content = 'pixels') => {
    const file = File.create({
      ownerId: account.id,
      purpose: 'avatar',
      contentType: 'image/png',
    });
    await files.create(file);
    const eTag = `etag-${file.id}`;
    storage.originals.set(file.originalKey, {
      bytes: new TextEncoder().encode(content),
      eTag,
    });

    return { file, eTag, key: file.originalKey };
  };

  return { storage, images, processUpload, upload };
};

describe('ProcessUploadUseCase', () => {
  it('should store the variants and copy the avatar into the account', async () => {
    const { storage, processUpload, upload } = setup();
    const account = await addAccount();
    const { file, key, eTag } = await upload(account);

    await expect(processUpload.execute({ key, eTag })).resolves.toBe(
      'processed',
    );

    const avatar = (await stored(account))?.avatar;
    expect(avatar?.fileId).toBe(file.id);
    expect(Object.keys(avatar?.variants ?? {})).toEqual(['64', '256']);
    expect([...storage.publicAssets.keys()].sort()).toEqual(
      Object.values(avatar?.variants ?? {}).sort(),
    );
    await expect(files.find(file)).resolves.toMatchObject({
      status: 'PROCESSED',
      size: 6,
    });
  });

  it('should replace the avatar and delete what the old one left', async () => {
    const { storage, processUpload, upload } = setup();
    const account = await addAccount();
    const first = await upload(account, 'first');
    await processUpload.execute(first);
    const oldVariants = Object.values(
      (await stored(account))?.avatar?.variants ?? {},
    );
    // KSUIDs of the same second sort at random: the newer upload must be a second later.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = await upload(account, 'second');

    await expect(processUpload.execute(second)).resolves.toBe('processed');

    expect((await stored(account))?.avatar?.fileId).toBe(second.file.id);
    await expect(files.find(first.file)).resolves.toBeNull();
    expect(storage.originals.has(first.key)).toBe(false);
    oldVariants.forEach((key) => {
      expect(storage.publicAssets.has(key)).toBe(false);
    });
    expect(storage.publicAssets.size).toBe(2);
  });

  it('should keep the newer avatar when an older upload is processed after it', async () => {
    const { storage, processUpload, upload } = setup();
    const account = await addAccount();
    const older = await upload(account, 'older');
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const newer = await upload(account, 'newer');
    await processUpload.execute(newer);

    await expect(processUpload.execute(older)).resolves.toBe('outdated');

    expect((await stored(account))?.avatar?.fileId).toBe(newer.file.id);
    expect(storage.originals.has(older.key)).toBe(false);
    expect(storage.publicAssets.size).toBe(2);
  });

  it('should do nothing more for a file already processed', async () => {
    const { processUpload, upload } = setup();
    const account = await addAccount();
    const uploaded = await upload(account);
    await processUpload.execute(uploaded);

    await expect(processUpload.execute(uploaded)).resolves.toBe(
      'already-processed',
    );
  });

  it('should delete an object no record waits for', async () => {
    const { storage, processUpload } = setup();
    const account = await addAccount();
    const file = File.create({
      ownerId: account.id,
      purpose: 'avatar',
      contentType: 'image/png',
    });
    storage.originals.set(file.originalKey, {
      bytes: new Uint8Array(1),
      eTag: 'e',
    });

    await expect(
      processUpload.execute({ key: file.originalKey, eTag: 'e' }),
    ).resolves.toBe('unrecorded');
    expect(storage.originals.size).toBe(0);
  });

  it('should leave a replaced object to its own event', async () => {
    const { processUpload, upload } = setup();
    const account = await addAccount();
    const { file, key } = await upload(account);

    await expect(processUpload.execute({ key, eTag: 'older' })).resolves.toBe(
      'superseded',
    );
    await expect(files.find(file)).resolves.toMatchObject({
      status: 'PENDING',
    });
  });

  it('should fail a file that is not an image and delete its object', async () => {
    const { storage, images, processUpload, upload } = setup();
    const account = await addAccount();
    const uploaded = await upload(account);
    images.rejectWith = 'Input buffer contains unsupported image format';

    await expect(processUpload.execute(uploaded)).resolves.toBe('rejected');

    await expect(files.find(uploaded.file)).resolves.toMatchObject({
      status: 'FAILED',
    });
    expect(storage.originals.size).toBe(0);
    expect((await stored(account))?.avatar).toBeUndefined();
  });
});
