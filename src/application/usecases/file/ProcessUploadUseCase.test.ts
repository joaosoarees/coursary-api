import { describe, expect, it } from 'vitest';

import { FakeFileStorage } from '@tests/fakes/FakeFileStorage';
import { FakeImageProcessor } from '@tests/fakes/FakeImageProcessor';
import { accountWorld } from '@tests/support/accountWorld';

import { Course } from '@application/entities/course/Course';
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

  const upload = async (
    owner: { id: string },
    content = 'pixels',
    purpose: File.Purpose = 'avatar',
  ) => {
    const file = File.create({
      ownerId: owner.id,
      purpose,
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

// KSUIDs of the same second have no order of their own: the older is the smaller id.
const byId = <T extends { file: File }>(a: T, b: T): [T, T] =>
  a.file.id < b.file.id ? [a, b] : [b, a];

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

  it('should copy a processed cover into its course', async () => {
    const { storage, processUpload, upload } = setup();
    const instructor = await addAccount({ name: 'ana' });
    const course = Course.create({ instructor, title: 'DynamoDB' });
    await courses.create(course);
    const uploaded = await upload(course, 'cover', 'cover');

    await expect(processUpload.execute(uploaded)).resolves.toBe('processed');

    const cover = (await courses.findById(course.id, { consistent: true }))
      ?.cover;
    expect(cover?.fileId).toBe(uploaded.file.id);
    expect(Object.keys(cover?.variants ?? {}).sort()).toEqual(['1280', '480']);
    expect(storage.publicAssets.size).toBe(2);
  });

  it('should drop a cover for a course being deleted', async () => {
    const { storage, processUpload, upload } = setup();
    const instructor = await addAccount({ name: 'ana' });
    const course = Course.create({ instructor, title: 'DynamoDB' });
    await courses.create(course);
    const uploaded = await upload(course, 'cover', 'cover');
    await courses.markDeleting(course.id);

    await expect(processUpload.execute(uploaded)).resolves.toBe('owner-gone');

    expect(storage.publicAssets.size).toBe(0);
    expect(storage.originals.size).toBe(0);
  });

  it('should confirm lesson material as sent, without making anything of it', async () => {
    const { storage, processUpload, upload } = setup();
    const lesson = { id: (await addAccount()).id };
    const uploaded = await upload(lesson, '%PDF-1.7', 'attachment');

    await expect(processUpload.execute(uploaded)).resolves.toBe('uploaded');

    await expect(files.find(uploaded.file)).resolves.toMatchObject({
      status: 'UPLOADED',
      size: 8,
    });
    expect(storage.publicAssets.size).toBe(0);
    expect(storage.originals.has(uploaded.key)).toBe(true);
  });

  it('should replace the video of a lesson once the new one is confirmed', async () => {
    const { storage, processUpload, upload } = setup();
    const lesson = { id: (await addAccount()).id };
    const [first, second] = byId(
      await upload(lesson, 'old video', 'video'),
      await upload(lesson, 'new video', 'video'),
    );
    await processUpload.execute(first);

    await expect(processUpload.execute(second)).resolves.toBe('uploaded');

    await expect(files.find(second.file)).resolves.toMatchObject({
      status: 'UPLOADED',
      size: 9,
    });
    await expect(files.find(first.file)).resolves.toBeNull();
    expect(storage.originals.has(first.key)).toBe(false);
    expect(storage.originals.has(second.key)).toBe(true);
  });

  it('should drop a video confirmed after a newer one', async () => {
    const { storage, processUpload, upload } = setup();
    const lesson = { id: (await addAccount()).id };
    const [older, newer] = byId(
      await upload(lesson, 'older', 'video'),
      await upload(lesson, 'newer', 'video'),
    );
    await processUpload.execute(newer);

    await expect(processUpload.execute(older)).resolves.toBe('outdated');

    await expect(files.find(older.file)).resolves.toBeNull();
    expect(storage.originals.has(older.key)).toBe(false);
    await expect(files.find(newer.file)).resolves.toMatchObject({
      status: 'UPLOADED',
    });
  });

  it('should leave a video whose key another object took to that object', async () => {
    const { storage, processUpload, upload } = setup();
    const lesson = { id: (await addAccount()).id };
    const uploaded = await upload(lesson, 'video', 'video');
    storage.originals.set(uploaded.key, {
      bytes: new Uint8Array(1),
      eTag: 'other',
    });

    await expect(processUpload.execute(uploaded)).resolves.toBe('superseded');
    await expect(files.find(uploaded.file)).resolves.toMatchObject({
      status: 'PENDING',
    });
  });
});
