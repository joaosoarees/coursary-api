import { describe, expect, it } from 'vitest';

import { Account } from '@application/entities/account/Account';
import { File } from '@application/entities/file/File';

const account = Account.create({ name: 'Ana', email: 'ana@example.com' });

describe('File.create', () => {
  it('should start pending under the owner the purpose belongs to', () => {
    const file = File.create({
      ownerId: account.id,
      purpose: 'avatar',
      contentType: 'image/png',
    });

    expect(file).toMatchObject({
      ownerType: 'account',
      ownerId: account.id,
      purpose: 'avatar',
      status: 'PENDING',
      size: undefined,
      variants: undefined,
    });
    expect(File.isId(file.id)).toBe(true);
  });
});

describe('File.parseOriginalKey', () => {
  it('should read back the key the server built', () => {
    const file = File.create({
      ownerId: account.id,
      purpose: 'avatar',
      contentType: 'image/png',
    });

    expect(file.originalKey).toBe(
      `account/${account.id}/avatar/${file.id}/original`,
    );
    expect(File.parseOriginalKey(file.originalKey)).toEqual({
      ownerType: 'account',
      ownerId: account.id,
      purpose: 'avatar',
      id: file.id,
    });
  });

  it.each([
    ['another name', `account/${account.id}/avatar/${account.id}/other`],
    [
      'an unknown purpose',
      `account/${account.id}/cover/${account.id}/original`,
    ],
    ['a short id', `account/abc/avatar/${account.id}/original`],
    ['a nested path', `x/account/${account.id}/avatar/${account.id}/original`],
  ])('should refuse %s', (_, key) => {
    expect(File.parseOriginalKey(key)).toBeNull();
  });
});

describe('File cover', () => {
  it("should keep a cover under its course and refuse an avatar's key for a course", () => {
    const courseId = account.id;
    const cover = File.create({
      ownerId: courseId,
      purpose: 'cover',
      contentType: 'image/jpeg',
    });

    expect(cover.originalKey).toBe(
      `course/${courseId}/cover/${cover.id}/original`,
    );
    expect(File.parseOriginalKey(cover.originalKey)).toMatchObject({
      ownerType: 'course',
      purpose: 'cover',
    });
    expect(
      File.parseOriginalKey(`course/${courseId}/avatar/${cover.id}/original`),
    ).toBeNull();
    expect(File.ruleOf('cover')).toMatchObject({
      maxBytes: 10 * 1024 * 1024,
      image: { fit: 'inside' },
    });
  });
});

describe('File attachment', () => {
  it('should keep material under its lesson, with its name, and confirm it as sent', () => {
    const lessonId = account.id;
    const material = File.create({
      ownerId: lessonId,
      purpose: 'attachment',
      contentType: 'application/pdf',
      name: 'Slides.pdf',
      position: 2,
    });

    expect(material.originalKey).toBe(
      `lesson/${lessonId}/attachment/${material.id}/original`,
    );
    expect(File.parseOriginalKey(material.originalKey)).toMatchObject({
      ownerType: 'lesson',
      purpose: 'attachment',
    });
    expect(File.ruleOf('attachment')).toMatchObject({
      maxBytes: 50 * 1024 * 1024,
      maxPerOwner: 20,
    });
    expect(File.ruleOf('attachment').image).toBeUndefined();

    material.markUploaded(321);

    expect(material).toMatchObject({
      status: 'UPLOADED',
      size: 321,
      name: 'Slides.pdf',
      position: 2,
    });
  });
});

describe('File.ownerPrefixOf', () => {
  it('should cover every key of the owner and no other owner', () => {
    const prefix = File.ownerPrefixOf({
      ownerType: 'lesson',
      ownerId: account.id,
    });
    const material = File.create({
      ownerId: account.id,
      purpose: 'attachment',
      contentType: 'application/pdf',
      name: 'a.pdf',
    });

    expect(prefix).toBe(`lesson/${account.id}/`);
    expect(material.originalKey.startsWith(prefix)).toBe(true);
    expect(`lesson/${account.id}x/attachment`.startsWith(prefix)).toBe(false);
  });
});

describe('File.process', () => {
  it('should keep the real size and the variants', () => {
    const file = File.create({
      ownerId: account.id,
      purpose: 'avatar',
      contentType: 'image/png',
    });

    file.process({ size: 1234, variants: { 64: 'a.webp' } });

    expect(file).toMatchObject({
      status: 'PROCESSED',
      size: 1234,
      variants: { 64: 'a.webp' },
    });
  });
});

describe('File.variantKeyOf', () => {
  it('should name a variant after its content, beside the original', () => {
    const file = File.create({
      ownerId: account.id,
      purpose: 'avatar',
      contentType: 'image/png',
    });
    const bytes = new TextEncoder().encode('pixels');

    const key = File.variantKeyOf(file, '64', bytes);

    expect(key).toMatch(
      new RegExp(
        `^account/${account.id}/avatar/${file.id}/64-[0-9a-f]{16}\\.webp$`,
      ),
    );
    expect(File.variantKeyOf(file, '64', bytes)).toBe(key);
    expect(
      File.variantKeyOf(file, '64', new TextEncoder().encode('other')),
    ).not.toBe(key);
  });
});
