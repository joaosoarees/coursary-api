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
