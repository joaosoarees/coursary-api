import type { ImageProcessor } from '@application/gateways/file/ImageProcessor';

// Each variant's bytes are its name and the input's, so new content gives new keys.
export class FakeImageProcessor implements ImageProcessor {
  rejectWith: string | undefined;

  makeVariants({
    bytes,
    sizes,
  }: ImageProcessor.Input): Promise<ImageProcessor.Result> {
    if (this.rejectWith) {
      return Promise.resolve({ rejected: this.rejectWith });
    }

    const variants = sizes.map(({ name }) => ({
      name,
      bytes: new Uint8Array([...new TextEncoder().encode(name), ...bytes]),
    }));

    return Promise.resolve({ variants });
  }
}
