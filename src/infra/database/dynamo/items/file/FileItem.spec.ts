import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { File } from '@application/entities/file/File';
import { FileItem } from '@infra/database/dynamo/items/file/FileItem';

const account = Account.create({ name: 'Ana', email: 'ana@example.com' });

const avatar = () =>
  File.create({
    ownerId: account.id,
    purpose: 'avatar',
    contentType: 'image/png',
  });

describe('FileItem', () => {
  it("should keep a pending file in the owner's partition, with a TTL of a day", () => {
    const file = avatar();
    const now = Math.floor(Date.now() / 1000);

    const item = FileItem.fromEntity(file).toItem();

    expect(item).toMatchObject({
      PK: `ACCOUNT#${account.id}`,
      SK: `FILE#avatar#${file.id}`,
      originalKey: file.originalKey,
      status: 'PENDING',
      type: 'File',
    });
    expect(item.expiresAt).toBeGreaterThanOrEqual(now + 24 * 60 * 60);
  });

  it('should drop the TTL once processed', () => {
    const file = avatar();
    file.process({ size: 10, variants: { 64: 'v.webp' } });

    expect(FileItem.fromEntity(file).toItem().expiresAt).toBeUndefined();
  });

  it('should read back the same file it wrote', () => {
    const file = avatar();
    file.process({ size: 10, variants: { 64: 'v.webp' } });

    expect(FileItem.toEntity(FileItem.fromEntity(file).toItem())).toEqual(file);
  });

  it("should keep a cover in its course's partition", () => {
    const cover = File.create({
      ownerId: account.id,
      purpose: 'cover',
      contentType: 'image/png',
    });

    expect(FileItem.fromEntity(cover).toItem()).toMatchObject({
      PK: `COURSE#${account.id}`,
      SK: `FILE#cover#${cover.id}`,
    });
  });

  it("should keep material in its lesson's partition, with its name and position", () => {
    const material = File.create({
      ownerId: account.id,
      purpose: 'attachment',
      contentType: 'text/plain',
      name: 'Notes.txt',
      position: 0,
    });

    const item = FileItem.fromEntity(material).toItem();

    expect(item).toMatchObject({
      PK: `LESSON#${account.id}`,
      SK: `FILE#attachment#${material.id}`,
      name: 'Notes.txt',
      position: 0,
    });
    expect(FileItem.toEntity(item)).toEqual(material);
  });
});
