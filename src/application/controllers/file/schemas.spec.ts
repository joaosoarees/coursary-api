import { describe, expect, it } from 'vitest';

import {
  attachmentUploadSchema,
  videoCompletionSchema,
  videoPartUrlsSchema,
  videoUploadSchema,
} from '@application/controllers/file/schemas';

describe('attachmentUploadSchema', () => {
  it('should take a material type and a plain file name, trimmed', () => {
    expect(
      attachmentUploadSchema.parse({
        contentType: 'application/pdf',
        fileName: '  Aula 1 – slides.pdf ',
      }),
    ).toEqual({
      contentType: 'application/pdf',
      fileName: 'Aula 1 – slides.pdf',
    });
  });

  it.each([
    ['an image type', { contentType: 'image/gif', fileName: 'a.gif' }],
    ['a path', { contentType: 'text/plain', fileName: '../etc/passwd' }],
    [
      'a control character',
      { contentType: 'text/plain', fileName: 'a\nb.txt' },
    ],
    ['an empty name', { contentType: 'text/plain', fileName: '   ' }],
  ])('should refuse %s', (_, body) => {
    expect(attachmentUploadSchema.safeParse(body).success).toBe(false);
  });
});

describe('videoUploadSchema', () => {
  it('should take an MP4 of a declared size up to 2 GiB', () => {
    expect(
      videoUploadSchema.parse({
        contentType: 'video/mp4',
        size: 2 * 1024 * 1024 * 1024,
      }),
    ).toEqual({ contentType: 'video/mp4', size: 2 * 1024 * 1024 * 1024 });
  });

  it.each([
    ['another type', { contentType: 'video/webm', size: 1 }],
    ['an empty file', { contentType: 'video/mp4', size: 0 }],
    ['more than 2 GiB', { contentType: 'video/mp4', size: 2 * 1024 ** 3 + 1 }],
    ['a fraction', { contentType: 'video/mp4', size: 1.5 }],
  ])('should refuse %s', (_, body) => {
    expect(videoUploadSchema.safeParse(body).success).toBe(false);
  });
});

describe('videoPartUrlsSchema', () => {
  it('should take up to 100 part numbers at a time', () => {
    const fileId = 'a'.repeat(27);
    const partNumbers = Array.from({ length: 101 }, (_, index) => index + 1);

    expect(
      videoPartUrlsSchema.safeParse({ fileId, partNumbers: [1, 2] }).success,
    ).toBe(true);
    expect(videoPartUrlsSchema.safeParse({ fileId, partNumbers }).success).toBe(
      false,
    );
    expect(
      videoPartUrlsSchema.safeParse({ fileId, partNumbers: [0] }).success,
    ).toBe(false);
  });
});

describe('videoCompletionSchema', () => {
  it('should take each part with the ETag S3 returned', () => {
    const fileId = 'a'.repeat(27);

    expect(
      videoCompletionSchema.safeParse({
        fileId,
        parts: [{ partNumber: 1, eTag: '"abc"' }],
      }).success,
    ).toBe(true);
    expect(videoCompletionSchema.safeParse({ fileId, parts: [] }).success).toBe(
      false,
    );
  });
});
