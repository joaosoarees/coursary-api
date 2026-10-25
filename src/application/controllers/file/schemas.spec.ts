import { describe, expect, it } from 'vitest';

import { attachmentUploadSchema } from '@application/controllers/file/schemas';

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
