import sharp, { type Sharp } from 'sharp';
import { describe, expect, it } from 'vitest';

import { SharpImageProcessor } from '@infra/gateways/file/SharpImageProcessor';

const processor = new SharpImageProcessor();

const image = (width: number, height: number, channels: 3 | 4 = 3): Sharp =>
  sharp({
    create: {
      width,
      height,
      channels,
      background: { r: 200, g: 80, b: 40, alpha: channels === 4 ? 0.5 : 1 },
    },
  });

const bytesOf = async (pipeline: Sharp) =>
  new Uint8Array(await pipeline.toBuffer());

const avatarSizes = [
  { name: '64', width: 64, height: 64 },
  { name: '256', width: 256, height: 256 },
];

const coverSize = [{ name: '1280', width: 1280, height: 720 }];

const sizesOf = async (
  result: Awaited<ReturnType<typeof processor.makeVariants>>,
) => {
  if (!('variants' in result)) {
    throw new Error(`Rejected: ${result.rejected}`);
  }

  return Promise.all(
    result.variants.map(async ({ name, bytes }) => {
      const { format, width, height, hasAlpha } = await sharp(bytes).metadata();

      return { name, format, width, height, hasAlpha };
    }),
  );
};

describe('SharpImageProcessor', () => {
  it('should crop a photo into square webp avatars', async () => {
    const result = await processor.makeVariants({
      bytes: await bytesOf(image(1920, 1080).jpeg()),
      contentType: 'image/jpeg',
      fit: 'cover',
      sizes: avatarSizes,
    });

    expect(await sizesOf(result)).toEqual([
      expect.objectContaining({
        name: '64',
        format: 'webp',
        width: 64,
        height: 64,
      }),
      expect.objectContaining({
        name: '256',
        format: 'webp',
        width: 256,
        height: 256,
      }),
    ]);
  });

  it('should keep the transparency of a PNG and accept a WebP', async () => {
    const png = await processor.makeVariants({
      bytes: await bytesOf(image(300, 300, 4).png()),
      contentType: 'image/png',
      fit: 'cover',
      sizes: avatarSizes,
    });
    const webp = await processor.makeVariants({
      bytes: await bytesOf(image(300, 300).webp()),
      contentType: 'image/webp',
      fit: 'cover',
      sizes: avatarSizes,
    });

    expect((await sizesOf(png))[0]?.hasAlpha).toBe(true);
    expect(await sizesOf(webp)).toHaveLength(2);
  });

  it('should fit inside the box without cropping or enlarging', async () => {
    const portrait = await processor.makeVariants({
      bytes: await bytesOf(image(1080, 1920).jpeg()),
      contentType: 'image/jpeg',
      fit: 'inside',
      sizes: coverSize,
    });
    const small = await processor.makeVariants({
      bytes: await bytesOf(image(800, 450).jpeg()),
      contentType: 'image/jpeg',
      fit: 'inside',
      sizes: coverSize,
    });

    expect(await sizesOf(portrait)).toEqual([
      expect.objectContaining({ width: 405, height: 720 }),
    ]);
    expect(await sizesOf(small)).toEqual([
      expect.objectContaining({ width: 800, height: 450 }),
    ]);
  });

  it('should turn a photo upright from its EXIF orientation', async () => {
    const result = await processor.makeVariants({
      bytes: await bytesOf(
        image(200, 100).jpeg().withMetadata({ orientation: 6 }),
      ),
      contentType: 'image/jpeg',
      fit: 'inside',
      sizes: coverSize,
    });

    expect(await sizesOf(result)).toEqual([
      expect.objectContaining({ width: 100, height: 200 }),
    ]);
  });

  it.each([
    [
      'a PNG declared as JPEG',
      () => bytesOf(image(10, 10).png()),
      'image/jpeg',
      'png',
    ],
    ['a GIF', () => bytesOf(image(10, 10).gif()), 'image/png', 'unsupported'],
    [
      'text',
      () => Promise.resolve(new TextEncoder().encode('<html></html>')),
      'image/png',
      'unsupported',
    ],
    [
      'a truncated JPEG',
      async () => (await bytesOf(image(400, 400).jpeg())).slice(0, 600),
      'image/jpeg',
      'JPEG',
    ],
    [
      'an image over 16 MP',
      () => bytesOf(image(5000, 4000).png({ compressionLevel: 1 })),
      'image/png',
      'pixel limit',
    ],
  ])('should reject %s', async (_, bytes, contentType, reason) => {
    const result = await processor.makeVariants({
      bytes: await bytes(),
      contentType,
      fit: 'cover',
      sizes: avatarSizes,
    });

    expect('rejected' in result ? result.rejected : 'not rejected').toContain(
      reason,
    );
  });
});
