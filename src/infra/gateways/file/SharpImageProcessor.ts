import sharp from 'sharp';

import type { ImageProcessor } from '@application/gateways/file/ImageProcessor';

// An upload is untrusted input: every decoder but the three accepted types is refused
// before it reads a byte, for the whole process.
sharp.block({ operation: ['VipsForeignLoad'] });
sharp.unblock({
  operation: [
    'VipsForeignLoadJpegBuffer',
    'VipsForeignLoadPngBuffer',
    'VipsForeignLoadWebpBuffer',
  ],
});

export class SharpImageProcessor implements ImageProcessor {
  // Refused from the header, before decoding: progressive and interlaced images
  // above it do not fit 1024 MB.
  static readonly maxPixels = 16_000_000;

  static readonly quality = 80;

  private static readonly formats: Record<string, string> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  async makeVariants({
    bytes,
    contentType,
    fit,
    sizes,
  }: ImageProcessor.Input): Promise<ImageProcessor.Result> {
    try {
      const { format } = await SharpImageProcessor.open(bytes).metadata();

      if (format !== SharpImageProcessor.formats[contentType]) {
        return {
          rejected: `The content is ${format}, not ${contentType}.`,
        };
      }

      const variants = await Promise.all(
        sizes.map(async ({ name, width, height }) => {
          const variant = await SharpImageProcessor.open(bytes)
            .resize(width, height, {
              fit,
              withoutEnlargement: fit === 'inside',
            })
            .webp({ quality: SharpImageProcessor.quality })
            .toBuffer();

          return { name, bytes: new Uint8Array(variant) };
        }),
      );

      return { variants };
    } catch (error) {
      // Everything sharp throws here is about the bytes: unsupported, truncated or too large.
      return { rejected: (error as Error).message };
    }
  }

  private static open(bytes: Uint8Array) {
    return sharp(bytes, {
      limitInputPixels: SharpImageProcessor.maxPixels,
      failOn: 'warning',
      autoOrient: true,
    });
  }
}
